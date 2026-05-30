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
import { OwnerPeopleModule } from './owner-people/owner-people.module';
import { OwnerInvitesModule } from './owner-invites/owner-invites.module';
import { PlanTemplatesModule } from './plan-templates/plan-templates.module';
import { NutritionTemplatesModule } from './nutrition-templates/nutrition-templates.module';
import { FoodsModule } from './foods/foods.module';
import { EquipmentModule } from './equipment/equipment.module';
import { SelfTrainingModule } from './self-training/self-training.module';
import { SelfNutritionModule } from './self-nutrition/self-nutrition.module';
import { BodyTestsModule } from './body-tests/body-tests.module';
import { ServiceTypesModule } from './service-types/service-types.module';
import { BillingModule } from './billing/billing.module';
import { ScheduleModule } from './schedule/schedule.module';
import { MembersModule } from './members/members.module';
import { MemberHealthModule } from './member-health/member-health.module';
import { CheckInsModule } from './check-ins/check-ins.module';
import { CheckInConfigModule } from './check-in-config/check-in-config.module';
import { TrainerInvitesModule } from './trainer-invites/trainer-invites.module';

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
    OwnerPeopleModule,
    OwnerInvitesModule,
    PlanTemplatesModule,
    NutritionTemplatesModule,
    FoodsModule,
    EquipmentModule,
    SelfTrainingModule,
    SelfNutritionModule,
    BodyTestsModule,
    ServiceTypesModule,
    BillingModule,
    ScheduleModule,
    MembersModule,
    MemberHealthModule,
    CheckInsModule,
    CheckInConfigModule,
    TrainerInvitesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ConditionalThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
