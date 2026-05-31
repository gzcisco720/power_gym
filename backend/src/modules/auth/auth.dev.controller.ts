import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Dev/test-only routes for E2E test setup.
 * This controller is ONLY registered when NODE_ENV !== 'production'
 * (see auth.module.ts). It is absent from the production binary.
 */
@Controller('auth/dev')
export class AuthDevController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('reset-token')
  async createResetToken(@Body() body: { email: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    const token = await this.authService.createDevResetToken(body.email);
    return { token };
  }

  @HttpCode(200)
  @Post('seed-user')
  async seedUser(@Body() body: { email: string; password: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    // role is never accepted from the request body — always seeds as 'member'
    await this.authService.seedTestUser(body.email, body.password, 'member');
    return { ok: true };
  }
}
