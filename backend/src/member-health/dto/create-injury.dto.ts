import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import type {
  InjuryStatus,
  InjuryType,
  BodyPart,
  BodySide,
  RehabStatus,
  CreatedByRole,
} from '../../database/models/member-injury.model';

export class CreateInjuryDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsIn(['active', 'resolved'])
  status?: InjuryStatus;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsString()
  trainerNotes?: string | null;

  @IsOptional()
  @IsString()
  memberNotes?: string | null;

  @IsOptional()
  @IsString()
  affectedMovements?: string | null;

  @IsOptional()
  @IsIn(['acute', 'chronic', 'post_surgery'])
  injuryType?: InjuryType | null;

  @IsOptional()
  @IsIn([
    'knee',
    'shoulder',
    'lower_back',
    'hip',
    'ankle',
    'wrist',
    'neck',
    'other',
  ])
  bodyPart?: BodyPart | null;

  @IsOptional()
  @IsIn(['left', 'right', 'bilateral'])
  bodySide?: BodySide | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painAtRest?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painDuringExercise?: number | null;

  @IsOptional()
  @IsString()
  mechanism?: string | null;

  @IsOptional()
  @IsString()
  aggravatingFactors?: string | null;

  @IsOptional()
  @IsString()
  relievingFactors?: string | null;

  @IsOptional()
  @IsBoolean()
  seenDoctor?: boolean;

  @IsOptional()
  @IsString()
  doctorRestrictions?: string | null;

  @IsOptional()
  @IsIn(['not_started', 'in_progress', 'cleared'])
  rehabilitationStatus?: RehabStatus | null;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string | null;

  @IsOptional()
  @IsIn(['trainer', 'member'])
  createdByRole?: CreatedByRole;
}
