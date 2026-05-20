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

  async findAll(): Promise<Pet[]> {
    const { rows } = await pool.query<Pet>('SELECT * FROM pets');
    return rows;
  }

  async findOne(id: number): Promise<Pet> {
    const { rows } = await pool.query<Pet>(
      'SELECT * FROM pets WHERE pet_id = $1',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Pet no encontrado');
    }

    return rows[0];
  }

  async update(id: number, data: UpdatePetDto): Promise<Pet> {
    const query = `
      UPDATE pets
      SET
        pet_name = $1,
        pet_type_id = $2,
        breed_id = $3,
        birthdate = $4,
        owner_id = $5
      WHERE pet_id = $6
      RETURNING *;
    `;

    const values = [
      data.pet_name,
      data.pet_typeId,
      data.breed_id,
      data.birthdate,
      data.ownerId,
      id,
    ];

    const { rows } = await pool.query<Pet>(query, values);

    if (rows.length === 0) {
      throw new NotFoundException('Pet no encontrado');
    }

    return rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const { rows } = await pool.query<Pet>(
      'DELETE FROM pets WHERE pet_id = $1 RETURNING *',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Pet no encontrado');
    }

    return {
      message: '✅ Pet eliminado',
    };
  }
}
