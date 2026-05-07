import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
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

  @Post()
  create(@Body() createPetDto: any) {
    return this.petsService.create(createPetDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePetDto: any) {
    return this.petsService.update(Number(id), updatePetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.petsService.remove(Number(id));
  }
}
