import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../common/models/user.model';

export interface JwtPayload {
  sub: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  trainerId: string | null;
  iat?: number;
  exp?: number;
}

export interface JwtUser {
  sub: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  trainerId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      sub: payload.sub,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      trainerId: payload.trainerId,
    };
  }
}
