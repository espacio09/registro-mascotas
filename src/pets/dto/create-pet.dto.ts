import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  IsNumber,
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

  @IsString()
  @IsNotEmpty()
  owner_name!: string;

  @IsString()
  @IsNotEmpty()
  breed_name!: string;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  pet_typeId!: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  microchip_no?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  weight?: number;

  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  age?: number;
}
