import { IsEmail, IsIn, IsMongoId, IsOptional } from 'class-validator';

export class CreateInviteDto {
  @IsIn(['trainer', 'member'])
  role!: 'trainer' | 'member';

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsMongoId()
  trainerId?: string;
}
