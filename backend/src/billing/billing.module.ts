import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SERVICE_TYPE_MODEL,
  ServiceTypeSchema,
} from '../database/models/service-type.model';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import { ServiceTypeRepository } from '../repositories/service-type.repository';
import { UsersModule } from '../users/users.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SERVICE_TYPE_MODEL, schema: ServiceTypeSchema },
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
    ]),
    UsersModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, ServiceTypeRepository],
})
export class BillingModule {}
