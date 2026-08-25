import { Controller, Get, Param } from '@nestjs/common';
import { OwnersService } from './owners.service';

@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  async getAllOwners() {
    const owners = await this.ownersService.findAll();

    console.log(JSON.stringify(owners, null, 2));

    return owners;
  }

  @Get(':id')
  getOwnerById(@Param('id') owner_id: string) {
    return this.ownersService.findOne(Number(owner_id));
  }
}
