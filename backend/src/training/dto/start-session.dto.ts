import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class StartSessionDto {
  @IsNumber()
  dayNumber!: number;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsBoolean()
  deleteActive?: boolean;
}
