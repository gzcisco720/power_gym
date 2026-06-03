import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MacrosPer100gDto {
  @IsNumber()
  kcal: number;

  @IsNumber()
  protein: number;

  @IsNumber()
  carbs: number;

  @IsNumber()
  fat: number;

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

export class ServingDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  grams: number;
}

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  brand: string | null;

  @IsDefined()
  @ValidateNested()
  @Type(() => MacrosPer100gDto)
  macrosPer100g: MacrosPer100gDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServingDto)
  servings?: ServingDto[];
}
