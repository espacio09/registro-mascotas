import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // ✅ ACTIVAR VALIDACIÓN GLOBAL

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos no permitidos
      forbidNonWhitelisted: true, // error si mandan campos extra
      transform: true, // convierte tipos automáticamente
    }),
  );

  //Puerto dinámico para despliegue en plataformas 
  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);


  console.log('🚀 Server running on http://localhost:' + port);
}

bootstrap().catch((err) => {
  console.error('❌ Error starting app:', err);
  process.exit(1);
});
