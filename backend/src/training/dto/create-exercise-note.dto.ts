import { IsString, IsOptional } from 'class-validator';

export class CreateExerciseNoteDto {
  @IsString()
  memberId!: string;

  @IsString()
  exerciseId!: string;

  @IsString()
  exerciseName!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  sessionId: string | null = null;
}
