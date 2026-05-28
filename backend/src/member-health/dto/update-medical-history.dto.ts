import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { PregnancyStatus } from '../../database/models/member-medical-history.model';

export class UpdateMedicalHistoryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsString()
  surgeries?: string | null;

  @IsOptional()
  @IsString()
  allergies?: string | null;

  @IsOptional()
  @IsString()
  familyHistory?: string | null;

  @IsOptional()
  @IsString()
  currentDoctor?: string | null;

  @IsOptional()
  @IsString()
  emergencyContact?: string | null;

  @IsOptional()
  @IsIn(['n/a', 'not_pregnant', 'pregnant', 'postpartum'])
  pregnancyStatus?: PregnancyStatus | null;
}
