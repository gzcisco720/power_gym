import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanDayExerciseDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsBoolean()
  isSuperset: boolean;

  @IsString()
  @IsNotEmpty()
  exerciseId: string;

  @IsString()
  @IsNotEmpty()
  exerciseName: string;

  @IsOptional()
  @IsString()
  imageUrl: string | null;

  @IsBoolean()
  isBodyweight: boolean;

  @IsInt()
  @Min(1)
  sets: number;

  @IsInt()
  @Min(1)
  repsMin: number;

  @IsInt()
  @Min(1)
  repsMax: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds: number | null;
}

export class PlanDayDto {
  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayExerciseDto)
  exercises: PlanDayExerciseDto[];
}
