import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, {
    message: 'newPassword must contain at least one uppercase letter',
  })
  @Matches(/[0-9]/, { message: 'newPassword must contain at least one number' })
  newPassword: string;
}
