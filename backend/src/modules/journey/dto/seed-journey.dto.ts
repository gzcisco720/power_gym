import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SeedJourneyDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  memberEmail: string;
}
