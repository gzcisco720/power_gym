import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './common/email/email.module';
import { UsersModule } from './modules/users/users.module';
import { GymModule } from './modules/gym/gym.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { BodyTestsModule } from './modules/body-tests/body-tests.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/power_gym',
    ),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    AuthModule,
    EmailModule,
    UsersModule,
    GymModule,
    DashboardModule,
    EquipmentModule,
    ServiceTypesModule,
    CheckInsModule,
    BodyTestsModule,
    HealthModule,
  ],
})
export class AppModule {}
