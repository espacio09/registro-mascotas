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

  // ✅ Validación de fecha
  @IsOptional()
  @IsDateString()
  birthdate!: string;

  // ✅ Validación de número entero
  @IsInt()
  ownerId!: number;

  @IsOptional()
  @IsInt()
  breed_id!: number;

  @IsOptional()
  @IsInt()
  pet_typeId!: number;
}
