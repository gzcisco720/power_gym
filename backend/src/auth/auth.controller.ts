import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const AUTH_THROTTLE = {
  default: {
    limit: process.env.NODE_ENV === 'production' ? 10 : 50,
    ttl: 900000,
  },
};
const COOKIE_NAME = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...rest } = await this.authService.register(dto);
    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);
    return rest;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...rest } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);
    return rest;
  }

  @Public()
  @SkipThrottle()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: AuthUser & { refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...rest } = await this.authService.refresh(
      user.userId,
      user.refreshToken,
    );
    res.cookie(COOKIE_NAME, refresh_token, COOKIE_OPTIONS);
    return rest;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() _user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string>)?.refresh_token;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: COOKIE_OPTIONS.sameSite, secure: COOKIE_OPTIONS.secure });
    return { success: true };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
