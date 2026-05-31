import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['male', 'female'])
  sex?: 'male' | 'female';

  @IsOptional()
  height?: number;

  @IsOptional()
  @IsIn(['lose_fat', 'build_muscle', 'maintain', 'improve_performance'])
  fitnessGoal?:
    | 'lose_fat'
    | 'build_muscle'
    | 'maintain'
    | 'improve_performance';

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';

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
