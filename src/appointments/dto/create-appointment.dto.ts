import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
] as const;

export class CreateAppointmentDto {
  @IsInt()
  @Min(1)
  petId!: number;

  @IsInt()
  @Min(1)
  vetId!: number;

  @IsDateString()
  appointmentDate!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsIn(APPOINTMENT_STATUSES)
  status!: (typeof APPOINTMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}
