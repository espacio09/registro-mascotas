import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnersService } from './owners.service';
import { OwnersController } from './owners.controller';
import { OwnerEntity } from './entities/owner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OwnerEntity])],
  controllers: [OwnersController],
  providers: [OwnersService],
})
export class OwnersModule {}
