import { Module } from '@nestjs/common';
import { VetsServices } from './vets.services';
import { VetsController } from './vets.controller';

@Module({
  controllers: [VetsController],
  providers: [VetsServices],
})
export class VetsModule {}
