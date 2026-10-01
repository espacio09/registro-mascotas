import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { DeleteOwnersDto } from './dto/delete-owners.dto';
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

  @Post()
  createOwner(@Body() owner: CreateOwnerDto) {
    return this.ownersService.create(owner);
  }

  @Patch(':id')
  updateOwner(@Param('id') ownerId: string, @Body() owner: UpdateOwnerDto) {
    return this.ownersService.update(Number(ownerId), owner);
  }

  @Delete()
  deleteOwners(@Body() body: DeleteOwnersDto) {
    return this.ownersService.removeMany(body.ownerIds);
  }

  @Delete(':id')
  deleteOwner(@Param('id') ownerId: string) {
    return this.ownersService.remove(Number(ownerId));
  }
}
