import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

type FitnessGoal =
  | 'lose_fat'
  | 'build_muscle'
  | 'maintain'
  | 'improve_performance';
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
type Sex = 'male' | 'female';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsIn(['male', 'female'])
  sex?: Sex;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsIn(['lose_fat', 'build_muscle', 'maintain', 'improve_performance'])
  fitnessGoal?: FitnessGoal;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  fitnessLevel?: FitnessLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];
}
