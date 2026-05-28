import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { UsersModule } from '../users/users.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
    ]),
    UsersModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduledSessionRepository],
})
export class ScheduleModule {}
