import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsPositive,
  IsString,
} from 'class-validator';

export class DeleteSetDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  exerciseId: string;

  @IsInt()
  @IsPositive()
  setNumber: number;
}
