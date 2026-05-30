import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import {
  SERVICE_TYPE_MODEL,
  ServiceTypeSchema,
} from '../database/models/service-type.model';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { ServiceTypeRepository } from '../repositories/service-type.repository';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
      { name: SERVICE_TYPE_MODEL, schema: ServiceTypeSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    ScheduledSessionRepository,
    ServiceTypeRepository,
  ],
})
export class BillingModule {}
