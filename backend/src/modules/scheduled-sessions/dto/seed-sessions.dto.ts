import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SeedSessionItemDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @IsString()
  trainerEmail?: string;

  @IsOptional()
  @IsString()
  serviceTypeName?: string;

  @IsOptional()
  @IsString()
  customServiceName?: string;

  @IsOptional()
  @IsIn(['scheduled', 'cancelled'])
  status?: 'scheduled' | 'cancelled';
}

export class SeedSessionsDto {
  @IsString()
  @IsNotEmpty()
  memberEmail: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeedSessionItemDto)
  sessions: SeedSessionItemDto[];
}
