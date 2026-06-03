import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchFoodsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
