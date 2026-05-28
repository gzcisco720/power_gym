import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
} from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  @MinLength(1)
  name: string = '';

  @IsNumber()
  @Min(1)
  durationMin: number = 0;

  @IsNumber()
  @Min(0)
  pricePerSession: number = 0;

  @IsString()
  @IsOptional()
  note?: string;
}
