import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  IsOptional,
} from 'class-validator';

export class PatchSetDto {
  @IsInt()
  @IsPositive()
  setNumber: number;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  exerciseId: string;

  @IsInt()
  @Min(1)
  actualReps: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWeight: number | null;
}
