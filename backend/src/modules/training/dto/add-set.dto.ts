import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AddSetDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  exerciseId: string;
}
