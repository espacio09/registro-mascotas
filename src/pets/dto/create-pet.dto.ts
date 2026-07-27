import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  pet_name!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsString()
  @IsNotEmpty()
  sex!: string;

  // ✅ Validación de fecha
  @IsDateString()
  @IsNotEmpty()
  birthdate!: Date;

  // ✅ Validación de número entero
  @IsInt()
  @IsNotEmpty()
  ownerId!: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  breed_id!: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  pet_typeId!: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  microchip_no?: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  weight?: number;
}
