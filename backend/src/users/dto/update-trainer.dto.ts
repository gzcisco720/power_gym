import { IsMongoId, IsOptional, ValidateIf } from 'class-validator';

export class UpdateTrainerDto {
  @ValidateIf((o: UpdateTrainerDto) => o.trainerId !== null)
  @IsOptional()
  @IsMongoId()
  trainerId!: string | null;
}
