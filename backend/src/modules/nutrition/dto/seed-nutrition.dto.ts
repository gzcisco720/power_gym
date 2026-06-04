import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class SeedNutritionDto {
  @IsString()
  @IsNotEmpty()
  memberEmail: string;

  @IsString()
  @IsNotEmpty()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  templateId: string;
}
