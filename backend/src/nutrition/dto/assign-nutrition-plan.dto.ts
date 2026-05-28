import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayTypeDto } from './create-nutrition-template.dto';

export class WeeklyPatternEntryDto {
  @IsNumber()
  @IsIn([0, 1, 2, 3, 4, 5, 6])
  dayOfWeek!: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  @IsString()
  @IsNotEmpty()
  dayTypeName!: string;
}

export class CalendarOverrideDto {
  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  dayTypeName!: string;
}

export class ScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPatternEntryDto)
  weeklyPattern!: WeeklyPatternEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarOverrideDto)
  calendarOverrides!: CalendarOverrideDto[];

  @IsBoolean()
  iterate!: boolean;
}

export class AssignNutritionPlanDto {
  @IsOptional()
  @IsString()
  templateId?: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTypeDto)
  dayTypes!: DayTypeDto[];

  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule!: ScheduleDto;
}
