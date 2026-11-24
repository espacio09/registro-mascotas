import {
  IsDateString,
  IsDefined,
  IsIn,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VISIT_STATUSES } from './create-visit.dto';

export class UpdateVisitDto {
  @IsString()
  @MinLength(1)
  reason!: string;

  @IsString()
  diagnosis!: string;

  @IsString()
  treatment!: string;

  @IsString()
  medication!: string;

  @IsString()
  visitNotes!: string;

  @IsString()
  indication!: string;

  @IsIn(VISIT_STATUSES)
  visitStatus!: (typeof VISIT_STATUSES)[number];

  @ValidateIf((_, value: unknown) => value !== null)
  @IsDefined()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  followUpDate!: string | null;
}
