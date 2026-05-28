import { IsString, MinLength, Matches } from 'class-validator';

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_RE, {
    message:
      'Password must be at least 8 characters with 1 uppercase and 1 number',
  })
  newPassword!: string;
}
