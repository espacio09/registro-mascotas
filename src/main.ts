import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Pool, QueryResult } from 'pg';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const pool = new Pool({
    user: 'minniedb',
    password: 'mariposa',
    host: '127.0.0.1',
    database: 'minniedb',
    port: 5432,
  });

  try {
    const res: QueryResult = await pool.query('SELECT NOW()');
    console.log('✅ DB CONNECTION OK:', res.rows);
  } catch (err) {
    console.error('❌ DB ERROR:', err);
  } finally {
    await pool.end();
  }

  await app.listen(3000);
}

bootstrap().catch((err) => {
  console.error('❌ Error starting app:', err);
  process.exit(1);
});
