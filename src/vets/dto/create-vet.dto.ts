import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class CreateVetDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;
}
