import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConditionalThrottlerGuard } from './common/guards/conditional-throttler.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { EmailModule } from './email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { OwnerDashboardModule } from './owner-dashboard/owner-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 900000,
        limit: process.env.NODE_ENV === 'production' ? 100 : 1000,
      },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AccountModule,
    EmailModule,
    OwnerDashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ConditionalThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
