import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecurrenceDto {
  @IsInt()
  @Min(2)
  @Max(12)
  weeks: number;
}

export class CreateSessionDto {
  @IsISO8601()
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string;

  @IsArray()
  @IsMongoId({ each: true })
  memberIds: string[];

  @IsOptional()
  @IsMongoId()
  trainerId?: string;

  @IsOptional()
  @IsMongoId()
  serviceTypeId?: string;

  @IsOptional()
  @IsString()
  customServiceName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
