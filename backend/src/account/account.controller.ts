import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AccountService } from './account.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Patch('account/password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(user.userId, dto);
  }

  @Patch('account/email')
  @HttpCode(HttpStatus.OK)
  changeEmail(@CurrentUser() user: AuthUser, @Body() dto: ChangeEmailDto) {
    return this.accountService.changeEmail(user.userId, dto.email);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.accountService.getProfile(user.userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.accountService.updateProfile(user.userId, dto);
  }
}
