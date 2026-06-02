import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  durationMin: number;

  @IsNumber()
  @Min(0)
  pricePerSession: number;

  @IsOptional()
  @IsString()
  note?: string;
}
