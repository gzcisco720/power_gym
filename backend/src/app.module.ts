import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConditionalThrottlerGuard } from './common/guards/conditional-throttler.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountModule } from './account/account.module';
import { TrainingModule } from './training/training.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { BodyTestsModule } from './body-tests/body-tests.module';
import { ScheduleModule } from './schedule/schedule.module';
import { CheckInsModule } from './check-ins/check-ins.module';
import { EquipmentModule } from './equipment/equipment.module';
import { MemberHealthModule } from './member-health/member-health.module';
import { ProgressModule } from './progress/progress.module';
import { BillingModule } from './billing/billing.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { UploadModule } from './upload/upload.module';
import { CronModule } from './cron/cron.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

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
    UsersModule,
    AccountModule,
    TrainingModule,
    NutritionModule,
    BodyTestsModule,
    ScheduleModule,
    CheckInsModule,
    EquipmentModule,
    MemberHealthModule,
    ProgressModule,
    BillingModule,
    EmailModule,
    StorageModule,
    UploadModule,
    CronModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ConditionalThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
