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
    const { rows } = await pool.query<Pet>('SELECT * FROM pets');
    return rows.map((pet) => this.toApiPet(pet));
  }

  // ✅ GET ONE BY ID
  async findOne(id: number): Promise<Pet> {
    const { rows } = await pool.query<Pet>(
      'SELECT * FROM pets WHERE pet_id = $1',
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
    let query = 'SELECT * FROM pets WHERE 1=1';
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

    // ✅ Mapeo DTO → DB
    const fieldMap: Record<string, string> = {
      pet_name: 'pet_name',
      color: 'color',
      sex: 'sex',
      birthdate: 'birthdate',
      ownerId: 'owner_id',
      microchip_no: 'microchip_no',
      weight: 'weight',
      pet_typeId: 'pet_type_id',
      breed_id: 'breed_id',
    };

    // ✅ Construcción dinámica de update

    for (const key of Object.keys(data) as Array<keyof UpdatePetDto>) {
      const value = data[key];

      if (value !== undefined && fieldMap[key]) {
        if (key === 'weight') {
          const numericValue = Number(value);

          if (isNaN(numericValue) || numericValue <= 0) {
            throw new BadRequestException('Weight must be a positive number');
          }
          console.log(key, value, typeof value);

          values.push(numericValue);
        } else {
          values.push(value);
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
