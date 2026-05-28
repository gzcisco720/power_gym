import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateTrainerDto {
  @ValidateIf((o: UpdateTrainerDto) => o.trainerId !== null)
  @IsOptional()
  @IsString()
  trainerId!: string | null;
}
