import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateBodyTestDto {
  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @IsEnum(['male', 'female'])
  sex: 'male' | 'female';

  @IsNumber()
  @Min(1)
  weight: number;

  @IsEnum(['3site', '7site', '9site', 'other'])
  protocol: '3site' | '7site' | '9site' | 'other';

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
  @Min(1)
  @Max(60)
  bodyFatPct?: number;

  @IsOptional()
  @IsNumber()
  targetWeight?: number;

  @IsOptional()
  @IsNumber()
  targetBodyFatPct?: number;
}
