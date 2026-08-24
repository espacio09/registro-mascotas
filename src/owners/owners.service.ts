import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'minniedb',
  password: 'mariposa',
  database: 'minniedb',
});

@Injectable()
export class OwnersService {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM owners',
    );

    return rows;
  }

  async findOne(id: number) {
    const { rows } = await pool.query(
      'SELECT * FROM owners WHERE id = $1',
      [id],
    );

    return rows[0];
  }
}