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
      GROUP BY o.owner_id;`,
      [id],
    );

    return rows[0] as OwnerWithPets | undefined;
  }

  async create(owner: CreateOwnerDto) {
    const { rows } = await pool.query<{ owner_id: number }>(
      `INSERT INTO owners (first_name, last_name, address, email, phone)
       VALUES ($1, $2, $3, NULLIF($4, ''), $5)
       RETURNING owner_id`,
      [
        owner.first_name,
        owner.last_name,
        owner.address,
        owner.email ?? '',
        owner.phone,
      ],
    );

    return this.findOne(rows[0].owner_id);
  }

  async update(id: number, owner: UpdateOwnerDto) {
    const result = await pool.query(
      `UPDATE owners
       SET first_name = $1,
           last_name = $2,
           address = $3,
           email = NULLIF($4, ''),
           phone = $5
       WHERE owner_id = $6`,
      [
        owner.first_name,
        owner.last_name,
        owner.address,
        owner.email ?? '',
        owner.phone,
        id,
      ],
    );

    if (!result.rowCount) {
      throw new NotFoundException(`Propietario ${id} no encontrado.`);
    }

    return this.findOne(id);
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

      if (existingOwners.rows.length !== ownerIds.length) {
        throw new NotFoundException('Uno o más propietarios ya no existen.');
      }

      await client.query<{ pet_id: number }>(
        'SELECT pet_id FROM pets WHERE owner_id = ANY($1::int[]) FOR UPDATE',
        [ownerIds],
      );

      await client.query(
        `INSERT INTO "archivoOwners"
         OVERRIDING SYSTEM VALUE
         SELECT owners.*
         FROM owners
         WHERE owner_id = ANY($1::int[])`,
        [ownerIds],
      );

      await client.query(
        `INSERT INTO "archivoPets"
         OVERRIDING SYSTEM VALUE
         SELECT pets.*
         FROM pets
         WHERE owner_id = ANY($1::int[])`,
        [ownerIds],
      );

      await client.query(
        'DELETE FROM pets WHERE owner_id = ANY($1::int[])',
        [ownerIds],
      );

      const result = await client.query<{ owner_id: number }>(
        'DELETE FROM owners WHERE owner_id = ANY($1::int[]) RETURNING owner_id',
        [ownerIds],
      );

      if (result.rows.length !== ownerIds.length) {
        throw new NotFoundException('Uno o más propietarios ya no existen.');
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

      throw error;
    } finally {
      client.release();
    }
  }
}
