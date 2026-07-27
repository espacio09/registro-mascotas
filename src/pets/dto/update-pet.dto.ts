import { PartialType } from '@nestjs/mapped-types';
import { CreatePetDto } from './create-pet.dto';

import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

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

  // ✅ Validación de fecha
  @IsOptional()
  @IsDateString()
  birthdate?: Date;

  // ✅ Validación de número entero
  @IsOptional()
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsInt()
  breed_id?: number;

  @IsOptional()
  @IsInt()
  pet_typeId?: number;

  @IsOptional()
  @IsInt()
  microchip_no?: number;

  @IsOptional()
  @IsInt()
  weight?: number;
}
