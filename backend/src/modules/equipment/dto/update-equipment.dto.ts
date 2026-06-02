import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import type { EquipmentStatus } from '../../../common/models/equipment.model';

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['active', 'maintenance', 'retired'])
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsInt()
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
