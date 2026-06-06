import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
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

  @IsOptional()
  @IsBoolean()
  isExtraSet?: boolean;
}
