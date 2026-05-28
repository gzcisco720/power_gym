import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MealItemDto {
  @IsString()
  @IsNotEmpty()
  foodName!: string;

  @IsNumber()
  quantityG!: number;

  @IsNumber()
  kcal!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;

  @IsOptional()
  @IsNumber()
  fiber?: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;

  @IsOptional()
  @IsNumber()
  salt?: number;

  @IsOptional()
  @IsNumber()
  saturated?: number;

  @IsOptional()
  @IsNumber()
  polyunsaturated?: number;

  @IsOptional()
  @IsNumber()
  monounsaturated?: number;

  @IsOptional()
  @IsNumber()
  polyols?: number;

  @IsOptional()
  @IsNumber()
  cholesterol?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;

  @IsOptional()
  @IsNumber()
  potassium?: number;

  @IsOptional()
  @IsNumber()
  transFat?: number;
}

export class MealDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items!: MealItemDto[];
}

export class DayTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals!: MealDto[];
}

export class CreateNutritionTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTypeDto)
  dayTypes!: DayTypeDto[];
}

// ── Daily log meal DTOs ───────────────────────────────────────────────────────

export class DailyLogMealDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  order!: number;

  @IsBoolean()
  completed!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items!: MealItemDto[];
}
