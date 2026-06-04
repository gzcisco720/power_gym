import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AssignPlanDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  templateId: string;
}
