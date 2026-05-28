import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  INVITE_TOKEN_MODEL,
  InviteTokenSchema,
} from '../database/models/invite-token.model';
import {
  PASSWORD_RESET_TOKEN_MODEL,
  PasswordResetTokenSchema,
} from '../database/models/password-reset-token.model';
import {
  REFRESH_TOKEN_MODEL,
  RefreshTokenSchema,
} from '../database/models/refresh-token.model';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    EmailModule,
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: INVITE_TOKEN_MODEL, schema: InviteTokenSchema },
      { name: PASSWORD_RESET_TOKEN_MODEL, schema: PasswordResetTokenSchema },
      { name: REFRESH_TOKEN_MODEL, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenStrategy,
    UserRepository,
    InviteRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
  ],
  exports: [
    UserRepository,
    InviteRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
  ],
})
export class AuthModule {}
