import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';
import type { MedicationDuration } from '../../database/models/member-medication.model';

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsIn(['long_term', 'short_term'])
  duration!: MedicationDuration;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
