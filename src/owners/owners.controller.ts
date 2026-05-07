import { Controller, Get, Param } from '@nestjs/common';
import { OwnersService } from './owners.service';

@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  getAllOwners() {
    return this.ownersService.findAll();
  }

  @Get(':id')
  getOwnerById(@Param('id') id: string) {
    return this.ownersService.findOne(Number(id));
  }
}
