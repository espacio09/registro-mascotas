import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);

  console.log('🚀 Server running on http://localhost:3000');
}

bootstrap().catch((err) => {
  console.error('❌ Error starting app:', err);
  process.exit(1);
});
