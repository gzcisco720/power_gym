import { IsMongoId, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignTrainerDto {
  @Transform(({ value }: { value: string | null }) =>
    value === null ? null : value,
  )
  @IsOptional()
  @IsMongoId()
  trainerId: string | null;
}
