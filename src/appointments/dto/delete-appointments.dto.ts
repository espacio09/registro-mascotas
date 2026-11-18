import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class DeleteAppointmentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  appointmentIds!: number[];
}
