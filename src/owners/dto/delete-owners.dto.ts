import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt } from 'class-validator';

export class DeleteOwnersDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Selecciona al menos un propietario.' })
  @ArrayUnique({ message: 'La selección contiene IDs repetidos.' })
  @IsInt({ each: true, message: 'Los IDs de propietario deben ser números enteros.' })
  ownerIds!: number[];
}