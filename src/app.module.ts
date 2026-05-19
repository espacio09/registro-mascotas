import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnersModule } from './owners/owners.module';
import { PetsModule } from './pets/pets.module';
import { VetsModule } from './vets/vets.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      username: 'minniedb',
      password: 'mariposa',
      database: 'minniedb',
      autoLoadEntities: true,
      synchronize: true,
      logging: true,
    }),
    PetsModule,
    OwnersModule,
    VetsModule,
  ],
})
export class AppModule {}
