import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PLAN_TEMPLATE_MODEL,
  PlanTemplateSchema,
} from '../database/models/plan-template.model';
import {
  MEMBER_PLAN_MODEL,
  MemberPlanSchema,
} from '../database/models/member-plan.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  EXERCISE_MODEL,
  ExerciseSchema,
} from '../database/models/exercise.model';
import {
  EXERCISE_NOTE_MODEL,
  ExerciseNoteSchema,
} from '../database/models/exercise-note.model';
import {
  PERSONAL_BEST_MODEL,
  PersonalBestSchema,
} from '../database/models/personal-best.model';
import {
  SELF_WORKOUT_LOG_MODEL,
  SelfWorkoutLogSchema,
} from '../database/models/self-workout-log.model';
import {
  SELF_PERSONAL_BEST_MODEL,
  SelfPersonalBestSchema,
} from '../database/models/self-personal-best.model';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { ExerciseRepository } from '../repositories/exercise.repository';
import { ExerciseNoteRepository } from '../repositories/exercise-note.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { SelfPersonalBestRepository } from '../repositories/self-personal-best.repository';
import { UsersModule } from '../users/users.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PLAN_TEMPLATE_MODEL, schema: PlanTemplateSchema },
      { name: MEMBER_PLAN_MODEL, schema: MemberPlanSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: EXERCISE_MODEL, schema: ExerciseSchema },
      { name: EXERCISE_NOTE_MODEL, schema: ExerciseNoteSchema },
      { name: PERSONAL_BEST_MODEL, schema: PersonalBestSchema },
      { name: SELF_WORKOUT_LOG_MODEL, schema: SelfWorkoutLogSchema },
      { name: SELF_PERSONAL_BEST_MODEL, schema: SelfPersonalBestSchema },
    ]),
    UsersModule,
  ],
  controllers: [TrainingController],
  providers: [
    TrainingService,
    PlanTemplateRepository,
    MemberPlanRepository,
    WorkoutSessionRepository,
    ExerciseRepository,
    ExerciseNoteRepository,
    PersonalBestRepository,
    SelfWorkoutLogRepository,
    SelfPersonalBestRepository,
  ],
})
export class TrainingModule {}
