import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './interfaces/pets.interfaces';
import { PetsService } from './pets.service';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  async createPet(@Body() body: CreatePetDto): Promise<Pet> {
    return this.petsService.createPet(body);
  }

  @Get()
  async findAll(): Promise<Pet[]> {
    return this.petsService.findAll();
  }

  @Get('search')
  search(
    @Query('petId') petId?: string,
    @Query('petName') petName?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.petsService.search({
      petId: petId ? Number(petId) : undefined,
      petName: petName || undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Pet> {
    return this.petsService.findOne(id);
  }

  @Patch(':id')
  updatePet(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePetDto) {
    return this.petsService.updatePet(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.petsService.removePet(id);
  }
}
