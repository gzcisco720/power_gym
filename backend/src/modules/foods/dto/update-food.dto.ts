import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MacrosPer100gDto, ServingDto } from './create-food.dto';

export class UpdateFoodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => MacrosPer100gDto)
  macrosPer100g?: MacrosPer100gDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServingDto)
  servings?: ServingDto[];
}
