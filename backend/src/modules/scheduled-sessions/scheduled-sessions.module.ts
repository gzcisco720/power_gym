import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ScheduledSession,
  ScheduledSessionSchema,
} from '../../common/models/scheduled-session.model';
import { User, UserSchema } from '../../common/models/user.model';
import {
  ServiceType,
  ServiceTypeSchema,
} from '../../common/models/service-type.model';
import { ScheduledSessionsController } from './scheduled-sessions.controller';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { ScheduledSessionsDevController } from './scheduled-sessions.dev.controller';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [ScheduledSessionsDevController] : [];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledSession.name, schema: ScheduledSessionSchema },
      { name: User.name, schema: UserSchema },
      { name: ServiceType.name, schema: ServiceTypeSchema },
    ]),
  ],
  controllers: [ScheduledSessionsController, ...devControllers],
  providers: [ScheduledSessionsService],
  exports: [ScheduledSessionsService],
})
export class ScheduledSessionsModule {}
