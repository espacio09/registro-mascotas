import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { Pet } from './entities/pet.entity';
import { Owner } from '../owners/entities/owner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pet, Owner]), // Importamos ambas entidades
  ],
  controllers: [PetsController],
  providers: [PetsService],
})
export class PetsModule {}
