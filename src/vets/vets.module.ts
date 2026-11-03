import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VetsServices } from './vets.services';
import { VetsController } from './vets.controller';
import { VetEntity } from './entities/vet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VetEntity])],
  controllers: [VetsController],
  providers: [VetsServices],
})
export class VetsModule {}
