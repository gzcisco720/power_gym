import {
  IsArray,
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
  sleepQuality: number;

  @IsInt()
  @Min(1)
  @Max(10)
  stress: number;

  @IsInt()
  @Min(1)
  @Max(10)
  fatigue: number;

  @IsInt()
  @Min(1)
  @Max(10)
  hunger: number;

  @IsInt()
  @Min(1)
  @Max(10)
  recovery: number;

  @IsInt()
  @Min(1)
  @Max(10)
  energy: number;

  @IsInt()
  @Min(1)
  @Max(10)
  digestion: number;

  @IsEnum(['yes', 'no', 'partial'])
  stuckToDiet: 'yes' | 'no' | 'partial';

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  waist?: number;

  @IsOptional()
  @IsNumber()
  steps?: number;

  @IsOptional()
  @IsNumber()
  exerciseMinutes?: number;

  @IsOptional()
  @IsNumber()
  walkRunDistance?: number;

  @IsOptional()
  @IsNumber()
  sleepHours?: number;

  @IsOptional()
  @IsString()
  dietDetails?: string;

  @IsOptional()
  @IsString()
  wellbeing?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
