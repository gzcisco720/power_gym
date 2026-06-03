import {
  IsArray,
  IsIn,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateSessionDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  memberIds?: string[];

  @IsOptional()
  @IsMongoId()
  serviceTypeId?: string | null;

  @IsOptional()
  @IsString()
  customServiceName?: string | null;

  @IsOptional()
  @IsIn(['single', 'series'])
  scope?: 'single' | 'series';
}
