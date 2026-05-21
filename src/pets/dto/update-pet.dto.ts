import { IsString, IsDateString, IsOptional, IsInt } from 'class-validator';

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  pet_name!: string;

  @IsOptional()
  @IsDateString()
  birthdate!: string;

  @IsOptional()
  @IsInt()
  ownerId!: number;

  @IsOptional()
  @IsInt()
  breed_id!: number;

  @IsOptional()
  @IsInt()
  pet_typeId!: number;
}
