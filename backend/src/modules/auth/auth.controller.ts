import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtUser } from './strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: JwtUser;
  body: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @HttpCode(200)
  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.userId, refreshDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(
    @Request() req: RequestWithUser,
    @Body() body: { refreshToken?: string },
  ) {
    const userId = req.user.sub;
    await this.authService.logout(userId, body.refreshToken ?? '');
    return { message: 'Logged out' };
  }

  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message: 'If that email is registered, a reset link has been sent.',
    };
  }

  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully.' };
  }
}
