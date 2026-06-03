import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicationDto {
  @IsString()
  name: string;

  @IsString()
  purpose: string;

  @IsEnum(['long_term', 'short_term'])
  duration: 'long_term' | 'short_term';

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
