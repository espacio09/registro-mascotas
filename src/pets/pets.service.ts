import {
  BadRequestException,
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

@Injectable()
export class PetsService {
  // ✅ CREATE
  async createPet(data: CreatePetDto): Promise<Pet> {
    const query = `
      INSERT INTO pets (
        pet_name,
        pet_type_id,
        breed_id,
        birthdate,
        owner_id,
        color,
        sex,
        microchip_no
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      data.pet_name,
      data.pet_typeId,
      data.breed_id,
      new Date(data.birthdate),
      data.ownerId,
      data.color,
      data.sex,
      data.microchip_no,
    ];

    const { rows } = await pool.query<Pet>(query, values);
    return this.toApiPet(rows[0]);
  }

  // ✅ GET ALL (sin error)
  async findAll(): Promise<Pet[]> {
    const { rows } = await pool.query<Pet>(`
      SELECT
        pets.*,
        breeds.breed_name,
        CONCAT(owners.first_name, ' ', owners.last_name) AS owner_name,
        owners.birthdate AS owner_birthdate
      FROM pets
      LEFT JOIN breeds ON breeds.breed_id = pets.breed_id
      LEFT JOIN owners ON owners.owner_id = pets.owner_id
    `);
    return rows.map((pet) => this.toApiPet(pet));
  }

  // ✅ GET ONE BY ID
  async findOne(id: number): Promise<Pet> {
    const { rows } = await pool.query<Pet>(
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
      `,
      [id],
    );

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
      WHERE 1=1
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

    const { rows } = await pool.query<Pet>(query, values);

    return rows.map((pet) => this.toApiPet(pet));
  }

  async updatePet(id: number, data: UpdatePetDto): Promise<Pet> {
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
      pet_typeId: 'pet_type_id',
      breed_id: 'breed_id',
    };

    if (data.owner_name !== undefined) {
      const ownerName = data.owner_name.trim();

      if (!ownerName) {
        throw new BadRequestException('Owner name cannot be empty');
      }

      const ownerNameParts = ownerName.split(/\s+/);
      const firstName = ownerNameParts.shift() ?? '';
      const lastName = ownerNameParts.join(' ');

      if (data.owner_id !== undefined) {
        const ownerResult = await pool.query<{ owner_id: number }>(
          'SELECT owner_id FROM owners WHERE owner_id = $1',
          [data.owner_id],
        );

        if (!ownerResult.rows[0]) {
          throw new NotFoundException(`Owner ${data.owner_id} no encontrado`);
        }

        await pool.query(
          `
            UPDATE owners
            SET first_name = $1, last_name = $2, birthdate = $4
            WHERE owner_id = $3
          `,
          [firstName, lastName, data.owner_id, data.owner_birthdate],
        );
        resolvedOwnerId = data.owner_id;
      } else {
        const existingOwner = await pool.query<{ owner_id: number }>(
          `
            SELECT owner_id
            FROM owners
            WHERE LOWER(TRIM(first_name)) = LOWER($1)
              AND LOWER(TRIM(last_name)) = LOWER($2)
              AND birthdate = $3
            LIMIT 1
          `,
          [firstName, lastName, data.owner_birthdate],
        );

        if (existingOwner.rows[0]) {
          resolvedOwnerId = existingOwner.rows[0].owner_id;
        } else {
          const newOwner = await pool.query<{ owner_id: number }>(
            `
              INSERT INTO owners (first_name, last_name, birthdate)
              VALUES ($1, $2, $3)
              RETURNING owner_id
            `,
            [firstName, lastName, data.owner_birthdate],
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

    const { rows } = await pool.query<Pet>(query, values);

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

  // ✅ DELETE
  async removePet(id: number): Promise<{ message: string }> {
    const { rows } = await pool.query(
      'DELETE FROM pets WHERE pet_id = $1 RETURNING *',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Pet ${id} no encontrado`);
    }

    return {
      message: '✅ Pet eliminado',
    };
  }
}
