import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';

import { VetsService } from './vets.service';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';

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

  @Post()
  create(@Body() createVetDto: CreateVetDto) {
    return this.vetsService.create(createVetDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateVetDto: UpdateVetDto) {
    return this.vetsService.update(Number(id), updateVetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vetsService.remove(Number(id));
  }
}
