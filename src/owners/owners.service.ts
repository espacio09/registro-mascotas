import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
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
}
