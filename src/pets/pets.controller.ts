import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet } from './interfaces/pets.interfaces';
import { DeletePetDto } from './dto/delete-pet.dto';

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

  @Get('search')
  findOne(
    @Query('petId') petId?: string,
    @Query('pet_name') petName?: string,
    @Query('ownerId') ownerId?: string,
  ): Promise<Pet[]> {
    return this.petsService.search({
      petId: petId ? Number(petId) : undefined,
      petName: petName,
      ownerId: ownerId ? Number(ownerId) : undefined,
    });
  }

  @Patch(':id')
  updatePet(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePetDto) {
    return this.petsService.updatePet(id, dto);
  }

  @Delete(':id')
  removePet(@Param('id', ParseIntPipe) id: number, @Body() dto: DeletePetDto) {
    return this.petsService.removePet(id, dto);
  }
}
