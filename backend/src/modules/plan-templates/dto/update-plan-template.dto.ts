import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanDayDto } from './plan-day.dto';

export class UpdatePlanTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days: PlanDayDto[];
}
