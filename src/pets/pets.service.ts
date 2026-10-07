import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './interfaces/pets.interfaces';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'minniedb',
  password: 'mariposa',
  database: 'minniedb',
});

const MICROCHIP_DUPLICATE_MESSAGE =
  '¡El número de microchip ya existe! Verifique su entrada.';
const PET_ARCHIVE_TABLES_ERROR =
  'No se pueden archivar mascotas porque falta la tabla archivo_pets. Aplica la migración backend/sql/20261006_archive_owners_and_pets.sql y vuelve a intentarlo.';
const PET_ARCHIVE_PERMISSIONS_ERROR =
  'El usuario de la aplicación no tiene permisos para archivar mascotas. Ejecuta los GRANT de backend/sql/20261006_archive_owners_and_pets.sql con un usuario administrador de PostgreSQL.';

function getPetArchiveError(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  if (
    error.code === '42P01' &&
    'message' in error &&
    typeof error.message === 'string' &&
    /archivo_owners|archivo_pets/.test(error.message)
  ) {
    return PET_ARCHIVE_TABLES_ERROR;
  }

  if (
    error.code === '42501' &&
    'message' in error &&
    typeof error.message === 'string' &&
    /archivo_owners|archivo_pets/.test(error.message)
  ) {
    return PET_ARCHIVE_PERMISSIONS_ERROR;
  }

  return undefined;
}

@Injectable()
export class PetsService {
  async isMicrochipAvailable(
    microchipNo: number,
    excludePetId?: number,
  ): Promise<boolean> {
    const values: number[] = [microchipNo];
    const excludeCurrentPet = excludePetId !== undefined;

    if (excludeCurrentPet) {
      values.push(excludePetId);
    }

    const { rows } = await pool.query<{ pet_id: number }>(
      `
        SELECT pet_id
        FROM pets
        WHERE microchip_no = $1
        ${excludeCurrentPet ? 'AND pet_id <> $2' : ''}
        LIMIT 1
      `,
      values,
    );

    return rows.length === 0;
  }

  private async assertMicrochipAvailable(
    microchipNo: number | undefined,
    excludePetId?: number,
  ): Promise<void> {
    if (
      microchipNo !== undefined &&
      !(await this.isMicrochipAvailable(microchipNo, excludePetId))
    ) {
      throw new ConflictException(MICROCHIP_DUPLICATE_MESSAGE);
    }
  }

  private rethrowMicrochipUniqueViolation(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505' &&
      'constraint' in error &&
      error.constraint === 'pets_microchip_no_unique'
    ) {
      throw new ConflictException(MICROCHIP_DUPLICATE_MESSAGE);
    }

    throw error;
  }

  // ✅ CREATE
  async createPet(data: CreatePetDto): Promise<Pet> {
    await this.assertMicrochipAvailable(data.microchip_no);

    const rawOwnerName: unknown = data.owner_name;
    const ownerName =
      typeof rawOwnerName === 'string' ? rawOwnerName.trim() : '';

    if (!ownerName) {
      throw new BadRequestException('Owner name cannot be empty');
    }

    const nameParts = ownerName.split(/\s+/);
    const lastName = nameParts.at(-1)!;
    const firstName = nameParts.slice(0, -1).join(' ');

    if (!firstName || !lastName) {
      throw new BadRequestException('Owner last name cannot be empty');
    }

    const breedName = data.breed_name.trim();
    let resolvedBreedId: number;

    if (!breedName) {
      throw new BadRequestException('Breed name cannot be empty');
    }

    const newOwner = await pool.query<{ owner_id: number }>(
      `
        INSERT INTO owners (first_name, last_name)
        VALUES ($1, $2)
        RETURNING owner_id
      `,
      [firstName, lastName],
    );
    const resolvedOwnerId = newOwner.rows[0].owner_id;

    const existingBreed = await pool.query<{ breed_id: number }>(
      `
        SELECT breed_id
        FROM breeds
        WHERE LOWER(TRIM(breed_name)) = LOWER($1)
        LIMIT 1
      `,
      [breedName],
    );

    if (existingBreed.rows[0]) {
      resolvedBreedId = existingBreed.rows[0].breed_id;
    } else {
      const newBreed = await pool.query<{ breed_id: number }>(
        `
          INSERT INTO breeds (pet_type_id, breed_name)
          VALUES ($1, $2)
          RETURNING breed_id
        `,
        [data.pet_typeId, breedName],
      );
      resolvedBreedId = newBreed.rows[0].breed_id;
    }

    const query = `
      INSERT INTO pets (
        pet_name,
        pet_type_id,
        breed_id,
        birthdate,
        owner_id,
        color,
        sex,
        microchip_no,
        weight,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      data.pet_name,
      data.pet_typeId,
      resolvedBreedId,
      new Date(data.birthdate),
      resolvedOwnerId,
      data.color,
      data.sex,
      data.microchip_no,
      data.weight,
      data.notes,
    ];

    try {
      const { rows } = await pool.query<Pet>(query, values);
      return this.toApiPet(rows[0]);
    } catch (error) {
      this.rethrowMicrochipUniqueViolation(error);
    }
  }

  // ✅ GET ALL (sin error)
  async findAll(): Promise<Pet[]> {
    let rows: Pet[];
    try {
      ({ rows } = await pool.query<Pet>(`
        SELECT
          pets.*,
          breeds.breed_name,
          CONCAT(owners.first_name, ' ', owners.last_name) AS owner_name,
          owners.birthdate AS owner_birthdate
        FROM pets
        LEFT JOIN breeds ON breeds.breed_id = pets.breed_id
        LEFT JOIN owners ON owners.owner_id = pets.owner_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM archivo_pets archived
          WHERE archived.pet_id = pets.pet_id
        )
      `));
    } catch (error) {
      this.rethrowPetArchiveError(error);
    }
    return rows.map((pet) => this.toApiPet(pet));
  }

  async findBreedId(breedName: string): Promise<{ breed_id: number | null }> {
    const normalizedBreedName = breedName.trim();

    if (!normalizedBreedName) {
      return { breed_id: null };
    }

    const { rows } = await pool.query<{ breed_id: number }>(
      `
        SELECT breed_id
        FROM breeds
        WHERE LOWER(TRIM(breed_name)) = LOWER($1)
        LIMIT 1
      `,
      [normalizedBreedName],
    );

    return { breed_id: rows[0]?.breed_id ?? null };
  }

  // ✅ GET ONE BY ID
  async findOne(id: number): Promise<Pet> {
    let rows: Pet[];
    try {
      ({ rows } = await pool.query<Pet>(
        `
        SELECT
          pets.*,
          breeds.breed_name,
          CONCAT(owners.first_name, ' ', owners.last_name) AS owner_name,
          owners.birthdate AS owner_birthdate
        FROM pets
        LEFT JOIN breeds ON breeds.breed_id = pets.breed_id
        LEFT JOIN owners ON owners.owner_id = pets.owner_id
        WHERE pets.pet_id = $1
          AND NOT EXISTS (
            SELECT 1
            FROM archivo_pets archived
            WHERE archived.pet_id = pets.pet_id
          )
      `,
        [id],
      ));
    } catch (error) {
      this.rethrowPetArchiveError(error);
    }

    if (rows.length === 0) {
      throw new NotFoundException(`Pet ${id} no encontrado`);
    }

    return this.toApiPet(rows[0]);
  }

  // ✅ SEARCH DINÁMICO (lo que querías 👀🔥)
  async search(filters: {
    petId?: number;
    petName?: string;
    ownerId?: number;
  }): Promise<Pet[]> {
    let query = `
      SELECT
        pets.*,
        breeds.breed_name,
        CONCAT(owners.first_name, ' ', owners.last_name) AS owner_name,
        owners.birthdate AS owner_birthdate
      FROM pets
      LEFT JOIN breeds ON breeds.breed_id = pets.breed_id
      LEFT JOIN owners ON owners.owner_id = pets.owner_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM archivo_pets archived
        WHERE archived.pet_id = pets.pet_id
      )
    `;
    const values: any[] = [];

    console.log('petName from query:', filters.petName);
    console.log('QUERY:', query);
    console.log('VALUES:', values);

    if (filters.petId) {
      values.push(filters.petId);
      query += ` AND pet_id = $${values.length}`;
    }

    if (filters.petName) {
      values.push(`%${filters.petName}%`);
      query += ` AND pet_name ILIKE $${values.length}`;
    }

    if (filters.ownerId) {
      values.push(filters.ownerId);
      query += ` AND owner_id = $${values.length}`;
    }

    let rows: Pet[];
    try {
      ({ rows } = await pool.query<Pet>(query, values));
    } catch (error) {
      this.rethrowPetArchiveError(error);
    }

    return rows.map((pet) => this.toApiPet(pet));
  }

  async updatePet(id: number, data: UpdatePetDto): Promise<Pet> {
    await this.assertMicrochipAvailable(data.microchip_no, id);

    const fields: string[] = [];
    const values: (string | number | Date)[] = [];
    let resolvedBreedId = data.breed_id;
    let resolvedOwnerId = data.owner_id;

    // ✅ Mapeo DTO → DB
    const fieldMap: Record<string, string> = {
      pet_name: 'pet_name',
      color: 'color',
      sex: 'sex',
      birthdate: 'birthdate',
      owner_id: 'owner_id',
      microchip_no: 'microchip_no',
      weight: 'weight',
      notes: 'notes',
      pet_typeId: 'pet_type_id',
      breed_id: 'breed_id',
    };

    if (data.owner_name !== undefined) {
      const ownerName = data.owner_name.trim();

      if (!ownerName) {
        throw new BadRequestException('Owner name cannot be empty');
      }

      const nameParts = ownerName.split(/\s+/);
      const lastName = nameParts.at(-1)!;
      const firstName = nameParts.slice(0, -1).join(' ');

      if (!firstName || !lastName) {
        throw new BadRequestException('Owner last name cannot be empty');
      }

      if (data.owner_id !== undefined) {
        const ownerResult = await pool.query<{ owner_id: number }>(
          'SELECT owner_id FROM owners WHERE owner_id = $1',
          [data.owner_id],
        );

        if (!ownerResult.rows[0]) {
          throw new NotFoundException(`Owner ${data.owner_id} no encontrado`);
        }

        if (data.owner_birthdate !== undefined) {
          await pool.query(
            `
              UPDATE owners
              SET first_name = $1, last_name = $2, birthdate = $4
              WHERE owner_id = $3
            `,
            [firstName, lastName, data.owner_id, data.owner_birthdate],
          );
        } else {
          await pool.query(
            `
              UPDATE owners
              SET first_name = $1, last_name = $2
              WHERE owner_id = $3
            `,
            [firstName, lastName, data.owner_id],
          );
        }
        resolvedOwnerId = data.owner_id;
      } else {
        const existingOwner = await pool.query<{ owner_id: number }>(
          `
            SELECT owner_id
            FROM owners
            WHERE LOWER(TRIM(first_name)) = LOWER($1)
              AND LOWER(TRIM(last_name)) = LOWER($2)
            LIMIT 1
          `,
          [firstName, lastName],
        );

        if (existingOwner.rows[0]) {
          resolvedOwnerId = existingOwner.rows[0].owner_id;
        } else {
          const newOwner = await pool.query<{ owner_id: number }>(
            `
              INSERT INTO owners (first_name, last_name)
              VALUES ($1, $2)
              RETURNING owner_id
            `,
            [firstName, lastName],
          );
          resolvedOwnerId = newOwner.rows[0].owner_id;
        }
      }
    }

    if (data.breed_name !== undefined) {
      const breedName = data.breed_name.trim();

      if (!breedName) {
        throw new BadRequestException('Breed name cannot be empty');
      }

      const existingBreed = await pool.query<{ breed_id: number }>(
        `
          SELECT breed_id
          FROM breeds
          WHERE LOWER(TRIM(breed_name)) = LOWER($1)
          LIMIT 1
        `,
        [breedName],
      );

      if (existingBreed.rows[0]) {
        resolvedBreedId = existingBreed.rows[0].breed_id;
      } else {
        const petResult = await pool.query<{ pet_type_id: number }>(
          'SELECT pet_type_id FROM pets WHERE pet_id = $1',
          [id],
        );

        if (!petResult.rows[0]) {
          throw new NotFoundException(`Pet ${id} no encontrado`);
        }

        const petTypeId = data.pet_typeId ?? petResult.rows[0].pet_type_id;
        const newBreed = await pool.query<{ breed_id: number }>(
          `
            INSERT INTO breeds (pet_type_id, breed_name)
            VALUES ($1, $2)
            RETURNING breed_id
          `,
          [petTypeId, breedName],
        );

        resolvedBreedId = newBreed.rows[0].breed_id;
      }
    }

    const updateData =
      data.breed_name !== undefined || data.owner_name !== undefined
        ? { ...data, breed_id: resolvedBreedId, owner_id: resolvedOwnerId }
        : data;

    // ✅ Construcción dinámica de update

    for (const key of Object.keys(updateData) as Array<keyof UpdatePetDto>) {
      const value = updateData[key];

      if (key === 'breed_name') {
        continue;
      }

      if (key === 'owner_name') {
        continue;
      }

      if (value !== undefined && fieldMap[key]) {
        const updateValue =
          key === 'breed_id'
            ? resolvedBreedId
            : key === 'owner_id'
              ? resolvedOwnerId
              : value;

        if (updateValue === undefined) {
          continue;
        }

        if (key === 'weight') {
          const numericValue = Number(updateValue);

          if (isNaN(numericValue) || numericValue <= 0) {
            throw new BadRequestException('Weight must be a positive number');
          }
          console.log(key, value, typeof value);

          values.push(numericValue);
        } else {
          values.push(updateValue);
        }

        fields.push(`${fieldMap[key]} = $${values.length}`);
      }
    }

    // ✅ Validación
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // ✅ ID al final
    values.push(id);

    const query = `
    UPDATE pets
    SET ${fields.join(', ')}
    WHERE pet_id = $${values.length}
    RETURNING *;
  `;

    let rows: Pet[];
    try {
      ({ rows } = await pool.query<Pet>(query, values));
    } catch (error) {
      this.rethrowMicrochipUniqueViolation(error);
    }

    if (rows.length === 0) {
      throw new NotFoundException(`Pet ${id} no encontrado`);
    }

    return this.toApiPet(rows[0]);
  }

  private toApiPet(pet: Pet): Pet {
    return {
      ...pet,
      ownerId: pet.owner_id,
    };
  }

  private rethrowPetArchiveError(error: unknown): never {
    const archiveError = getPetArchiveError(error);
    if (archiveError) {
      throw new ConflictException(archiveError);
    }
    throw error;
  }

  // ✅ DELETE
  async removePet(id: number): Promise<{ message: string }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingPet = await client.query<{ pet_id: number }>(
        'SELECT pet_id FROM pets WHERE pet_id = $1 FOR UPDATE',
        [id],
      );

      if (existingPet.rows.length === 0) {
        throw new NotFoundException(`Pet ${id} no encontrado`);
      }

      await client.query(
        `INSERT INTO archivo_pets
         OVERRIDING SYSTEM VALUE
         SELECT pets.*
         FROM pets
         WHERE pet_id = $1`,
        [id],
      );

      const result = await client.query<{ pet_id: number }>(
        'DELETE FROM pets WHERE pet_id = $1 RETURNING pet_id',
        [id],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Pet ${id} no encontrado`);
      }

      await client.query('COMMIT');
      return { message: 'Mascota archivada y eliminada.' };
    } catch (error) {
      await client.query('ROLLBACK');

      const archiveError = getPetArchiveError(error);
      if (archiveError) {
        throw new ConflictException(archiveError);
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'El archivo ya contiene una mascota con el mismo identificador; no se eliminó ningún dato.',
        );
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23503'
      ) {
        throw new ConflictException(
          'No se pudo archivar la mascota porque otros registros dependen de ella.',
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
