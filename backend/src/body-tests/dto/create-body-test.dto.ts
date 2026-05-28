import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateBodyTestDto {
  @IsEnum(['3site', '7site', '9site', 'other'])
  protocol!: '3site' | '7site' | '9site' | 'other';

  @IsOptional()
  @IsEnum(['male', 'female'])
  sex?: 'male' | 'female';

  @IsOptional()
  @IsNumber()
  @Min(1)
  age?: number;

  @IsNumber()
  @IsPositive()
  weight!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bodyFatPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tricep?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chest?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subscapular?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  abdominal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suprailiac?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thigh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  midaxillary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bicep?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lumbar?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetWeight?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetBodyFatPct?: number | null;
}
