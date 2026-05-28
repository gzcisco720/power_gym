import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsIn(['trainer', 'member'])
  role!: 'trainer' | 'member';

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsString()
  trainerId?: string;
}
