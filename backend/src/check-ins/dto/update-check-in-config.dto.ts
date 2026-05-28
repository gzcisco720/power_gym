import { IsBoolean, IsInt, IsMongoId, Max, Min } from 'class-validator';

export class UpdateCheckInConfigDto {
  @IsMongoId()
  memberId: string = '';

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number = 0;

  @IsInt()
  @Min(0)
  @Max(23)
  hour: number = 0;

  @IsInt()
  @Min(0)
  @Max(59)
  minute: number = 0;

  @IsBoolean()
  active: boolean = true;
}
