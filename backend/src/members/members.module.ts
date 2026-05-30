import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  USER_PROFILE_MODEL,
  UserProfileSchema,
} from '../database/models/user-profile.model';
import {
  MEMBER_PLAN_MODEL,
  MemberPlanSchema,
} from '../database/models/member-plan.model';
import {
  MEMBER_NUTRITION_PLAN_MODEL,
  MemberNutritionPlanSchema,
} from '../database/models/member-nutrition-plan.model';
import {
  PERSONAL_BEST_MODEL,
  PersonalBestSchema,
} from '../database/models/personal-best.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  PLAN_TEMPLATE_MODEL,
  PlanTemplateSchema,
} from '../database/models/plan-template.model';
import { UserRepository } from '../repositories/user.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { ProgressController } from './progress.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: USER_PROFILE_MODEL, schema: UserProfileSchema },
      { name: MEMBER_PLAN_MODEL, schema: MemberPlanSchema },
      { name: MEMBER_NUTRITION_PLAN_MODEL, schema: MemberNutritionPlanSchema },
      { name: PERSONAL_BEST_MODEL, schema: PersonalBestSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: PLAN_TEMPLATE_MODEL, schema: PlanTemplateSchema },
    ]),
  ],
  controllers: [MembersController, ProgressController],
  providers: [
    MembersService,
    UserRepository,
    UserProfileRepository,
    MemberPlanRepository,
    MemberNutritionPlanRepository,
    PersonalBestRepository,
    WorkoutSessionRepository,
    PlanTemplateRepository,
  ],
})
export class MembersModule {}
