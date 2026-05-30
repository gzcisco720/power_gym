import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BODY_TEST_MODEL,
  BodyTestSchema,
} from '../database/models/body-test.model';
import {
  PERSONAL_BEST_MODEL,
  PersonalBestSchema,
} from '../database/models/personal-best.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import {
  MEMBER_NUTRITION_PLAN_MODEL,
  MemberNutritionPlanSchema,
} from '../database/models/member-nutrition-plan.model';
import {
  MEMBER_PLAN_MODEL,
  MemberPlanSchema,
} from '../database/models/member-plan.model';
import {
  CHECK_IN_MODEL,
  CheckInSchema,
} from '../database/models/check-in.model';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { CheckInRepository } from '../repositories/check-in.repository';
import { MemberPortalService } from './member-portal.service';
import { MemberPortalController } from './member-portal.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BODY_TEST_MODEL, schema: BodyTestSchema },
      { name: PERSONAL_BEST_MODEL, schema: PersonalBestSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
      { name: MEMBER_NUTRITION_PLAN_MODEL, schema: MemberNutritionPlanSchema },
      { name: MEMBER_PLAN_MODEL, schema: MemberPlanSchema },
      { name: CHECK_IN_MODEL, schema: CheckInSchema },
    ]),
  ],
  controllers: [MemberPortalController],
  providers: [
    MemberPortalService,
    BodyTestRepository,
    PersonalBestRepository,
    WorkoutSessionRepository,
    ScheduledSessionRepository,
    MemberNutritionPlanRepository,
    MemberPlanRepository,
    CheckInRepository,
  ],
})
export class MemberPortalModule {}
