import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import {
  AuthUser,
  UserRole,
} from '../../common/interfaces/auth-user.interface';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): Promise<AuthUser & { refreshToken: string }> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const record = await this.refreshTokenRepo.findActiveByToken(token);
    if (!record) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken: token,
    };
  }
}
