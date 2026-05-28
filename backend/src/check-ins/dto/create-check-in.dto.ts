import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCheckInDto {
  @IsInt()
  @Min(1)
  @Max(10)
  sleepQuality: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  stress: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  fatigue: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  hunger: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  recovery: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  energy: number = 0;

  @IsInt()
  @Min(1)
  @Max(10)
  digestion: number = 0;

  @IsEnum(['yes', 'no', 'partial'])
  stuckToDiet: 'yes' | 'no' | 'partial' = 'yes';

  @IsOptional()
  @IsNumber()
  weight?: number | null;

  @IsOptional()
  @IsNumber()
  waist?: number | null;

  @IsOptional()
  @IsNumber()
  steps?: number | null;

  @IsOptional()
  @IsNumber()
  exerciseMinutes?: number | null;

  @IsOptional()
  @IsNumber()
  walkRunDistance?: number | null;

  @IsOptional()
  @IsNumber()
  sleepHours?: number | null;

  @IsOptional()
  @IsString()
  dietDetails?: string;

  @IsOptional()
  @IsString()
  wellbeing?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
