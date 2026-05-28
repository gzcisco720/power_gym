import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  SELF_WORKOUT_LOG_MODEL,
  SelfWorkoutLogSchema,
} from '../database/models/self-workout-log.model';
import {
  CHECK_IN_CONFIG_MODEL,
  CheckInConfigSchema,
} from '../database/models/check-in-config.model';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import { UserRepository } from '../repositories/user.repository';
import { EmailModule } from '../email/email.module';
import { CronService } from './cron.service';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: SELF_WORKOUT_LOG_MODEL, schema: SelfWorkoutLogSchema },
      { name: CHECK_IN_CONFIG_MODEL, schema: CheckInConfigSchema },
      { name: USER_MODEL, schema: UserSchema },
    ]),
    EmailModule,
  ],
  providers: [
    CronService,
    ScheduledSessionRepository,
    WorkoutSessionRepository,
    SelfWorkoutLogRepository,
    CheckInConfigRepository,
    UserRepository,
  ],
  exports: [CronService],
})
export class CronModule {}
