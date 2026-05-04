import { Pool } from 'pg';

export const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'password',
  database: 'MinnieDB',
  port: 5432,
});
