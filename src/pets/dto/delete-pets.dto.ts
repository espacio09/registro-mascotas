import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt } from 'class-validator';

export class DeletePetsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Selecciona al menos una mascota.' })
  @ArrayUnique({ message: 'La selección contiene IDs repetidos.' })
  @IsInt({ each: true, message: 'Los IDs de mascota deben ser números enteros.' })
  petIds!: number[];
}
