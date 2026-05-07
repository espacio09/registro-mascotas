import { Controller, Get, Param } from '@nestjs/common';
import { VetsService } from './vets.services';

@Controller('vets')
export class VetsController {
  constructor(private readonly vetsService: VetsService) {}

  @Get()
  getAllVets() {
    return this.vetsService.findAll();
  }

  @Get(':id')
  getVetById(@Param('id') id: string) {
    return this.vetsService.findOne(Number(id));
  }
}
