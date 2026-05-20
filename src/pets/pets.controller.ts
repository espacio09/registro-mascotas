import { Controller, Get, Post, Put } from '@nestjs/common';
import { Param, Body } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './interfaces/pets.interfaces';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  async createPet(@Body() body: CreatePetDto) {
    try {
      const createPetDto: CreatePetDto = body;
      return await this.petsService.createPet(createPetDto);
    } catch (err: unknown) {
      console.error('❌ FULL ERROR:', err);

      return {
        statusCode: 500,
        message: 'Error servidor',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  @Get()
  findAll(): Promise<Pet[]> {
    return this.petsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petsService.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petsService.update(Number(id), updatePetDto);
  }
}
