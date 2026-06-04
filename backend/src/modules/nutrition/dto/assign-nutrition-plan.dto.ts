import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AssignNutritionPlanDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  templateId: string;
}
