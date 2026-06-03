import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  muscleGroup: string | null;

  @IsBoolean()
  isBodyweight: boolean;
}
