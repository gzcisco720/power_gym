import { IsInt, IsPositive } from 'class-validator';

export class StartSessionDto {
  @IsInt()
  @IsPositive()
  dayNumber: number;
}
