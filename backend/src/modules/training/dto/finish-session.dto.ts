import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FinishSessionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  rpe?: number;
}
