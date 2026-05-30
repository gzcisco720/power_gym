import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SELF_WORKOUT_LOG_MODEL,
  SelfWorkoutLogSchema,
} from '../database/models/self-workout-log.model';
import {
  SELF_PERSONAL_BEST_MODEL,
  SelfPersonalBestSchema,
} from '../database/models/self-personal-best.model';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { SelfPersonalBestRepository } from '../repositories/self-personal-best.repository';
import { SelfTrainingService } from './self-training.service';
import { SelfTrainingController } from './self-training.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SELF_WORKOUT_LOG_MODEL, schema: SelfWorkoutLogSchema },
      { name: SELF_PERSONAL_BEST_MODEL, schema: SelfPersonalBestSchema },
    ]),
  ],
  controllers: [SelfTrainingController],
  providers: [
    SelfTrainingService,
    SelfWorkoutLogRepository,
    SelfPersonalBestRepository,
  ],
})
export class SelfTrainingModule {}
