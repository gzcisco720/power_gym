import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import {
  ScheduledSession,
  ScheduledSessionSchema,
} from '../../common/models/scheduled-session.model';
import {
  ServiceType,
  ServiceTypeSchema,
} from '../../common/models/service-type.model';
import { User, UserSchema } from '../../common/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledSession.name, schema: ScheduledSessionSchema },
      { name: ServiceType.name, schema: ServiceTypeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
