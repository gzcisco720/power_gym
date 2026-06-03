import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsString()
  surgeries?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  currentDoctor?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsEnum(['n/a', 'not_pregnant', 'pregnant', 'postpartum'])
  pregnancyStatus?: 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum';
}
