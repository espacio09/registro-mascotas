import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { UpdateOwnerDto } from './dto/update-owner.dto';

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

  @Patch(':id')
  updateOwner(@Param('id') ownerId: string, @Body() owner: UpdateOwnerDto) {
    return this.ownersService.update(Number(ownerId), owner);
  }
}
