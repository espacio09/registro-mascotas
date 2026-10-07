import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'minniedb',
  password: 'mariposa',
  database: 'minniedb',
});

export interface OwnerWithPets {
  owner_id: number;
  first_name: string;
  last_name: string;
  address?: string;
  email?: string;
  phone?: string;
  pets: Record<string, unknown>[];
}

const DUPLICATE_OWNER_EMAIL_MESSAGE =
  'Ya existe un propietario registrado con este correo electrónico.';
const DUPLICATE_OWNER_NAME_MESSAGE =
  'Ya existe un propietario con el mismo nombre y apellido. Por favor, verifica que sea correcto.';
const DUPLICATE_OWNER_RECORD_MESSAGE =
  'Este propietario ya está registrado con el mismo nombre, apellido y teléfono.';

function isDuplicateOwnerEmailError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'owners_email_unique'
  );
}

function isDuplicateOwnerRecordError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === 'unique_owner'
  );
}

@Injectable()
export class OwnersService {
  async findAll() {
    const { rows } = await pool.query<OwnerWithPets>(
      `SELECT
  o.*,
  COALESCE(
    json_agg(p.*) FILTER (WHERE p.pet_id IS NOT NULL),
    '[]'
  ) AS pets
FROM owners o
LEFT JOIN pets p ON p.owner_id = o.owner_id
WHERE NOT EXISTS (
  SELECT 1
  FROM archivo_owners archived
  WHERE archived.owner_id = o.owner_id
)
GROUP BY o.owner_id;`,
    );

    return rows;
  }

  async findOne(id: number) {
    const { rows } = await pool.query<OwnerWithPets>(
      `SELECT
        o.*,
        COALESCE(
          json_agg(p.*) FILTER (WHERE p.pet_id IS NOT NULL),
          '[]'::json
        ) AS pets
      FROM owners o
      LEFT JOIN pets p ON p.owner_id = o.owner_id
      WHERE o.owner_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM archivo_owners archived
          WHERE archived.owner_id = o.owner_id
        )
      GROUP BY o.owner_id;`,
      [id],
    );

    return rows[0] as OwnerWithPets | undefined;
  }

  async create(owner: CreateOwnerDto) {
    const email = owner.email?.trim() ?? '';
    await this.ensureEmailAvailable(email);
    if (!owner.confirm_duplicate_name) {
      await this.ensureOwnerNameIsUnique(owner.first_name, owner.last_name);
    }

    let rows: { owner_id: number }[];
    try {
      ({ rows } = await pool.query<{ owner_id: number }>(
        `INSERT INTO owners (first_name, last_name, address, email, phone)
         VALUES ($1, $2, $3, NULLIF($4, ''), $5)
         RETURNING owner_id`,
        [owner.first_name, owner.last_name, owner.address, email, owner.phone],
      ));
    } catch (error) {
      if (isDuplicateOwnerEmailError(error)) {
        throw new ConflictException(DUPLICATE_OWNER_EMAIL_MESSAGE);
      }
      if (isDuplicateOwnerRecordError(error)) {
        throw new ConflictException(DUPLICATE_OWNER_RECORD_MESSAGE);
      }
      throw error;
    }

    return this.findOne(rows[0].owner_id);
  }

  async update(id: number, owner: UpdateOwnerDto) {
    const email = owner.email?.trim() ?? '';
    await this.ensureEmailAvailable(email, id);

    let rowCount: number | null;
    try {
      const result = await pool.query(
        `UPDATE owners
         SET first_name = $1,
             last_name = $2,
             address = $3,
             email = NULLIF($4, ''),
             phone = $5
         WHERE owner_id = $6`,
        [owner.first_name, owner.last_name, owner.address, email, owner.phone, id],
      );
      rowCount = result.rowCount;
    } catch (error) {
      if (isDuplicateOwnerEmailError(error)) {
        throw new ConflictException(DUPLICATE_OWNER_EMAIL_MESSAGE);
      }
      if (isDuplicateOwnerRecordError(error)) {
        throw new ConflictException(DUPLICATE_OWNER_RECORD_MESSAGE);
      }
      throw error;
    }

    if (!rowCount) {
      throw new NotFoundException(`Propietario ${id} no encontrado.`);
    }

    return this.findOne(id);
  }

  private async ensureEmailAvailable(email: string, ownerId?: number) {
    if (!email) return;

    const ownerFilter = ownerId === undefined ? '' : 'AND owner_id <> $2';
    const values = ownerId === undefined ? [email] : [email, ownerId];
    const { rows } = await pool.query<{ owner_id: number }>(
      `SELECT owner_id
       FROM owners
       WHERE lower(btrim(email)) = lower($1)
         AND email IS NOT NULL
         ${ownerFilter}
       LIMIT 1`,
      values,
    );

    if (rows.length > 0) {
      throw new ConflictException(DUPLICATE_OWNER_EMAIL_MESSAGE);
    }
  }

  private async ensureOwnerNameIsUnique(firstName: string, lastName: string) {
    const { rows } = await pool.query<{ owner_id: number }>(
      `SELECT owner_id
       FROM owners
       WHERE lower(btrim(first_name)) = lower($1)
         AND lower(btrim(last_name)) = lower($2)
       LIMIT 1`,
      [firstName.trim(), lastName.trim()],
    );

    if (rows.length > 0) {
      throw new ConflictException({
        code: 'DUPLICATE_OWNER_NAME',
        message: DUPLICATE_OWNER_NAME_MESSAGE,
      });
    }
  }

  async remove(id: number) {
    await this.removeMany([id]);
    return { owner_id: id };
  }

  async removeMany(ownerIds: number[]) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingOwners = await client.query<{ owner_id: number }>(
        'SELECT owner_id FROM owners WHERE owner_id = ANY($1::int[]) FOR UPDATE',
        [ownerIds],
      );

      const existingOwnerIds = new Set(
        existingOwners.rows.map((owner) => Number(owner.owner_id)),
      );
      const missingOwnerIds = ownerIds.filter(
        (ownerId) => !existingOwnerIds.has(ownerId),
      );

      if (missingOwnerIds.length > 0) {
        throw new NotFoundException(
          `No se encontraron los propietarios seleccionados con ID: ${missingOwnerIds.join(', ')}. Actualiza la lista e inténtalo de nuevo.`,
        );
      }

      const existingPets = await client.query<{ pet_id: number }>(
        'SELECT pet_id FROM pets WHERE owner_id = ANY($1::int[]) FOR UPDATE',
        [ownerIds],
      );

      const archivedOwners = await client.query<{ owner_id: number }>(
        `INSERT INTO archivo_owners
         OVERRIDING SYSTEM VALUE
         SELECT owners.*
         FROM owners
         WHERE owner_id = ANY($1::int[])
         RETURNING owner_id`,
        [ownerIds],
      );

      const archivedOwnerIds = new Set(
        archivedOwners.rows.map((owner) => Number(owner.owner_id)),
      );
      const ownersMissingFromArchive = ownerIds.filter(
        (ownerId) => !archivedOwnerIds.has(ownerId),
      );
      if (ownersMissingFromArchive.length > 0) {
        throw new ConflictException(
          `No se archivaron todos los propietarios seleccionados. IDs no copiados: ${ownersMissingFromArchive.join(', ')}.`,
        );
      }

      const archivedPets = await client.query<{ pet_id: number }>(
        `INSERT INTO archivo_pets
         OVERRIDING SYSTEM VALUE
         SELECT pets.*
         FROM pets
         WHERE owner_id = ANY($1::int[])
         RETURNING pet_id`,
        [ownerIds],
      );

      const archivedPetIds = new Set(
        archivedPets.rows.map((pet) => Number(pet.pet_id)),
      );
      const petsMissingFromArchive = existingPets.rows
        .map((pet) => Number(pet.pet_id))
        .filter((petId) => !archivedPetIds.has(petId));
      if (petsMissingFromArchive.length > 0) {
        throw new ConflictException(
          `No se archivaron todas las mascotas relacionadas. IDs de mascotas no copiadas: ${petsMissingFromArchive.join(', ')}.`,
        );
      }

      await client.query(
        'DELETE FROM pets WHERE owner_id = ANY($1::int[])',
        [ownerIds],
      );

      const result = await client.query<{ owner_id: number }>(
        'DELETE FROM owners WHERE owner_id = ANY($1::int[]) RETURNING owner_id',
        [ownerIds],
      );

      const deletedOwnerIds = new Set(
        result.rows.map((owner) => Number(owner.owner_id)),
      );
      const ownersNotDeleted = ownerIds.filter(
        (ownerId) => !deletedOwnerIds.has(ownerId),
      );
      if (ownersNotDeleted.length > 0) {
        throw new ConflictException(
          `No se eliminaron los propietarios con ID: ${ownersNotDeleted.join(', ')}. La operación se canceló y no se archivó ningún registro.`,
        );
      }

      await client.query('COMMIT');
      return { deletedOwnerIds: result.rows.map((owner) => owner.owner_id) };
    } catch (error) {
      await client.query('ROLLBACK');

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23503'
      ) {
        throw new ConflictException(
          'No se pudieron archivar y eliminar los propietarios porque otros registros dependen de sus mascotas.',
        );
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'El archivo ya contiene registros con los mismos identificadores; no se eliminó ningún dato.',
        );
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '42P01' &&
        'message' in error &&
        typeof error.message === 'string' &&
        /archivo_owners|archivo_pets/.test(error.message)
      ) {
        throw new ConflictException(
          'No se pueden eliminar propietarios porque faltan las tablas archivo_owners o archivo_pets. Aplica la migración backend/sql/20261006_archive_owners_and_pets.sql y vuelve a intentarlo.',
        );
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '42501' &&
        'message' in error &&
        typeof error.message === 'string' &&
        /archivo_owners|archivo_pets/.test(error.message)
      ) {
        throw new ConflictException(
          'El usuario de la aplicación no tiene permisos para archivar propietarios y mascotas. Ejecuta los GRANT de backend/sql/20261006_archive_owners_and_pets.sql con un usuario administrador de PostgreSQL.',
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
