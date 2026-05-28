import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import type { EquipmentStatus } from '../../database/models/equipment.model';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsIn(['active', 'maintenance', 'retired'])
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsBoolean()
  trackCondition?: boolean;

  @IsOptional()
  @IsDateString()
  nextServiceDate?: string | null;
}
