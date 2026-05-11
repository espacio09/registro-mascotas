import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';

import { VetsServices } from './vets.services';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';

@Controller('vets')
export class VetsController {
  vetsServices: any;
  constructor(private readonly vetsService: VetsServices) {}

  @Get()
  getAllVets() {
    return this.vetsServices.findAll();
  }

  @Get(':id')
  getVetById(@Param('id') id: string) {
    return this.vetsService.findOne(Number(id));
  }

  @Post()
  create(@Body() createVetDto: CreateVetDto) {
    return this.vetsServices.create(createVetDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateVetDto: UpdateVetDto) {
    return this.vetsServices.update(Number(id), updateVetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vetsServices.remove(Number(id));
  }
}
