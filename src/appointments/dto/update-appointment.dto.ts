import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { APPOINTMENT_STATUSES } from './create-appointment.dto';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: (typeof APPOINTMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string | null;
}
