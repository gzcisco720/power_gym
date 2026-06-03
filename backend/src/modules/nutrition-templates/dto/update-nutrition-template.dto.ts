import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DayTypeDto } from './day-type.dto';

export class UpdateNutritionTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTypeDto)
  dayTypes: DayTypeDto[];
}
