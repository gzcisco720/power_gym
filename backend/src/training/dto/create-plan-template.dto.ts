import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanDayExerciseDto {
  @IsString()
  groupId!: string;

  @IsBoolean()
  isSuperset!: boolean;

  @IsString()
  exerciseId!: string;

  @IsString()
  exerciseName!: string;

  @IsOptional()
  @IsString()
  imageUrl: string | null = null;

  @IsBoolean()
  isBodyweight!: boolean;

  @IsNumber()
  @Min(1)
  sets!: number;

  @IsNumber()
  @Min(1)
  repsMin!: number;

  @IsNumber()
  @Min(1)
  repsMax!: number;

  @IsOptional()
  @IsNumber()
  restSeconds: number | null = null;
}

export class PlanDayDto {
  @IsNumber()
  dayNumber!: number;

  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayExerciseDto)
  exercises!: PlanDayExerciseDto[];
}

export class CreatePlanTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description: string | null = null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days: PlanDayDto[] = [];
}
