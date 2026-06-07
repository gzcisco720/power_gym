import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCheckInScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @IsOptional()
  minute?: number;

  @IsBoolean()
  active: boolean;
}
