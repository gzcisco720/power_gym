import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
    ]),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduledSessionRepository],
})
export class ScheduleModule {}
