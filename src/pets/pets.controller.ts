import { Controller, Get, Param } from '@nestjs/common';
import { PetsService } from './pets.service';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  getAllPets() {
    return this.petsService.findAll();
  }

  @Get(':id')
  getPetById(@Param('id') id: string) {
    return this.petsService.findOne(Number(id));
  }
}
