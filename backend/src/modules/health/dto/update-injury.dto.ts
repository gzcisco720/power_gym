import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInjuryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['active', 'resolved'])
  status?: 'active' | 'resolved';

  @IsOptional()
  @IsString()
  memberNotes?: string;

  @IsOptional()
  @IsString()
  affectedMovements?: string;

  @IsOptional()
  @IsEnum(['acute', 'chronic', 'post_surgery'])
  injuryType?: 'acute' | 'chronic' | 'post_surgery';

  @IsOptional()
  @IsEnum([
    'knee',
    'shoulder',
    'lower_back',
    'hip',
    'ankle',
    'wrist',
    'neck',
    'other',
  ])
  bodyPart?:
    | 'knee'
    | 'shoulder'
    | 'lower_back'
    | 'hip'
    | 'ankle'
    | 'wrist'
    | 'neck'
    | 'other';

  @IsOptional()
  @IsEnum(['left', 'right', 'bilateral'])
  bodySide?: 'left' | 'right' | 'bilateral';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painAtRest?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painDuringExercise?: number;

  @IsOptional()
  @IsString()
  mechanism?: string;

  @IsOptional()
  @IsString()
  aggravatingFactors?: string;

  @IsOptional()
  @IsString()
  relievingFactors?: string;

  @IsOptional()
  @IsBoolean()
  seenDoctor?: boolean;

  @IsOptional()
  @IsString()
  doctorRestrictions?: string;

  @IsOptional()
  @IsEnum(['not_started', 'in_progress', 'cleared'])
  rehabilitationStatus?: 'not_started' | 'in_progress' | 'cleared';

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  resolvedAt?: Date;
}
