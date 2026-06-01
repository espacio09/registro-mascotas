import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // ✅ ACTIVAR CORS (ESTO FALTABA)
  app.enableCors();

  // ✅ VALIDACIÓN
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
  console.log('🚀 Server running on http://localhost:' + port);
}

bootstrap().catch((err) => {
  console.error('❌ Error starting app:', err);
  process.exit(1);
});
