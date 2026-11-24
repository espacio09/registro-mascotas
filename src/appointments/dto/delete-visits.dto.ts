import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class DeleteVisitsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  visitIds!: number[];
}
