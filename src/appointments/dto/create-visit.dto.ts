import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { APPOINTMENT_STATUSES } from './create-appointment.dto';

export const VISIT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'FOLLOW_UP_REQUIRED',
] as const;

export class AppointmentDetailsForVisitDto {
  @IsDateString()
  appointmentDate!: string;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsIn(APPOINTMENT_STATUSES)
  status!: (typeof APPOINTMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateVisitDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => AppointmentDetailsForVisitDto)
  appointment!: AppointmentDetailsForVisitDto;

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  medication?: string;

  @IsOptional()
  @IsString()
  visitNotes?: string;

  @IsOptional()
  @IsString()
  indication?: string;

  @IsIn(VISIT_STATUSES)
  visitStatus!: (typeof VISIT_STATUSES)[number];
}
