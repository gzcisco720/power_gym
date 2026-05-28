import { IsNumber, IsOptional } from 'class-validator';

export class UpdateSetDto {
  @IsOptional()
  @IsNumber()
  actualWeight: number | null = null;

  @IsOptional()
  @IsNumber()
  actualReps: number | null = null;
}
