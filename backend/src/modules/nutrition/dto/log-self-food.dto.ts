import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class LogSelfFoodDto {
  @IsString()
  @IsNotEmpty()
  foodName: string;

  @IsNumber()
  @Min(0)
  quantityG: number;

  @IsNumber()
  @Min(0)
  kcal: number;

  @IsNumber()
  @Min(0)
  protein: number;

  @IsNumber()
  @Min(0)
  carbs: number;

  @IsNumber()
  @Min(0)
  fat: number;
}
