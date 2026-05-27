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

  @Get('search')
  search(
    @Query()
    query: {
      petId?: number;
      petName?: string;
      ownerId?: number;
    },
  ) {
    console.log('FULL QUERY:', query);

    return this.petsService.search(query);
  }

  @Get()
  findAll(): Promise<Pet[]> {
    return this.petsService.findAll();
  }

  @Get('search')
  findOne(
    @Query('petId') petId?: number,
    @Query('petName') petName?: string,
    @Query('ownerId') ownerId?: number,
  ): Promise<Pet[]> {
    return this.petsService.search({
      petId: petId,
      petName: petName,
      ownerId: ownerId,
    });
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
