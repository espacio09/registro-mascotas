import { Injectable, NotFoundException } from '@nestjs/common';
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
        owner_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      data.pet_name,
      data.pet_typeId,
      data.breed_id,
      new Date(data.birthdate),
      data.ownerId,
    ];

    const { rows } = await pool.query<Pet>(query, values);
    return rows[0];
  }

  // ✅ GET ALL (sin error)
  async findAll(): Promise<Pet[]> {
    const { rows } = await pool.query<Pet>('SELECT * FROM pets');
    return rows;
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

    return rows[0];
  }

  // ✅ SEARCH DINÁMICO (lo que querías 👀🔥)
  async search(filters: {
    petId?: number;
    petName?: string;
    ownerId?: number;
  }): Promise<Pet[]> {

    let query = 'SELECT * FROM pets WHERE 1=1';
    const values: any[] = [];

    if (filters.petId) {
      values.push(filters.petId);
      query += ` AND pet_id = $${values.length}`;
    }

    if (filters.petName) {
      values.push(filters.petName);
      query += ` AND pet_name ILIKE $${values.length}`;
    }

    if (filters.ownerId) {
      values.push(filters.ownerId);
      query += ` AND owner_id = $${values.length}`;
    }

    const { rows } = await pool.query<Pet>(query, values);

    return rows;
  }

  // ✅ PATCH REAL (dinámico 🔥)
  async updatePet(id: number, data: UpdatePetDto): Promise<Pet> {
    const fields: string[] = [];
    const values: (string | number | Date)[] = [];

    if (data.pet_name !== undefined) {
      values.push(data.pet_name);
      fields.push(`pet_name = $${values.length}`);
    }

    if (data.pet_typeId !== undefined) {
  values.push(data.pet_typeId);
  fields.push(`pet_type_id = $${values.length}`);
    }

    if (data.breed_id !== undefined) {
      values.push(data.breed_id);
      fields.push(`breed_id = $${values.length}`);
    }

    if (data.birthdate !== undefined) {
      values.push(data.birthdate);
      fields.push(`birthdate = $${values.length}`);
    }

    if (data.ownerId !== undefined) {
      values.push(data.ownerId);
      fields.push(`owner_id = $${values.length}`);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

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

    return rows[0];
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
