import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap().catch((err) => {
  console.error('❌ Error starting app:', err);
  process.exit(1);
});
