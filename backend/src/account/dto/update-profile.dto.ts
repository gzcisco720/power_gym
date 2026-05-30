import { IsString, IsOptional, IsNumber } from 'class-validator';
import type { IGymInfo } from '../../database/models/user-profile.model';

export class UpdateProfileDto {
  @IsOptional() @IsString() mobile?: string | null;
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() dateOfBirth?: Date | null;
  @IsOptional() @IsString() avatarUrl?: string | null;
  @IsOptional() @IsString() sex?: 'male' | 'female' | null;
  @IsOptional() @IsNumber() height?: number | null;
  @IsOptional() @IsString() fitnessGoal?:
    | 'lose_fat'
    | 'build_muscle'
    | 'maintain'
    | 'improve_performance'
    | null;
  @IsOptional() @IsString() fitnessLevel?:
    | 'beginner'
    | 'intermediate'
    | 'advanced'
    | null;
  @IsOptional() certifications?: string[];
  @IsOptional() @IsString() bio?: string | null;
  @IsOptional() specializations?: string[];
  @IsOptional() gymInfo?: IGymInfo | null;
}
