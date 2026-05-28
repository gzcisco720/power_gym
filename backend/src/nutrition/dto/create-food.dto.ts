import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FoodMacrosDto {
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

export class FoodServingDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  @IsPositive()
  grams!: number;
}

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @ValidateNested()
  @Type(() => FoodMacrosDto)
  macrosPer100g!: FoodMacrosDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodServingDto)
  servings!: FoodServingDto[];
}
