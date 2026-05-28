import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DailyLogMealDto } from './create-nutrition-template.dto';

export class LogNutritionDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsString()
  sourceTemplateId?: string | null;

  @IsOptional()
  @IsString()
  sourceTemplateDayTypeName?: string | null;

  @IsString()
  @IsNotEmpty()
  dayLabel!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyLogMealDto)
  meals!: DailyLogMealDto[];

  @IsBoolean()
  dayCompleted!: boolean;
}
