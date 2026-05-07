import { Module } from '@nestjs/common';
import { VetsService } from './vets.services';
import { VetsController } from './vets.controller';

@Module({
  controllers: [VetsController],
  providers: [VetsService],
})
export class VetsModule {}
