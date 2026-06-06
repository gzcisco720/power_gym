import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthDevController } from './auth.dev.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken, RefreshTokenSchema } from './models/refresh-token.model';
import { User, UserSchema } from '../../common/models/user.model';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from '../../common/models/password-reset-token.model';
import { EmailModule } from '../../common/email/email.module';
import {
  ServiceType,
  ServiceTypeSchema,
} from '../../common/models/service-type.model';
import {
  ScheduledSession,
  ScheduledSessionSchema,
} from '../../common/models/scheduled-session.model';
import { BodyTest, BodyTestSchema } from '../../common/models/body-test.model';
import { CheckIn, CheckInSchema } from '../../common/models/check-in.model';
import {
  MemberInjury,
  MemberInjurySchema,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationSchema,
} from '../../common/models/member-medication.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: User.name, schema: UserSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: ServiceType.name, schema: ServiceTypeSchema },
      { name: ScheduledSession.name, schema: ScheduledSessionSchema },
      { name: BodyTest.name, schema: BodyTestSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: MemberInjury.name, schema: MemberInjurySchema },
      { name: MemberMedication.name, schema: MemberMedicationSchema },
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
    ]),
    EmailModule,
  ],
  controllers: [
    AuthController,
    // Dev/test endpoints are excluded from the production binary entirely.
    ...(process.env.NODE_ENV !== 'production' ? [AuthDevController] : []),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
