import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateOwnerDto {
  @IsOptional()
  @IsInt()
  ownerId?: number;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  first_name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  last_name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  address!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  email?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  @Matches(/^\d+$/, { message: 'Número no válido.' })
  phone!: string;
}
