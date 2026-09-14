import { PartialType } from '@nestjs/mapped-types';
import { CreatePetDto } from './create-pet.dto';

import {
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePetDto extends PartialType(CreatePetDto) {
  @IsOptional()
  @IsString()
  pet_name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  owner_birthdate?: Date;

  @IsOptional()
  @IsString()
  breed_name?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthdate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  owner_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  breed_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pet_typeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  microchip_no?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  weight?: number;

}
