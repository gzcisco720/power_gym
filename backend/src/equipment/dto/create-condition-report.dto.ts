import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConditionReportDto {
  @IsString()
  @IsNotEmpty()
  note!: string;
}
