import { Pool } from 'pg';

export const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'mariposa',
  database: 'MinnieDB',
  port: 5432,
});
