import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  PLAN_TEMPLATE_MODEL,
  PlanTemplateSchema,
} from '../database/models/plan-template.model';
import {
  NUTRITION_TEMPLATE_MODEL,
  NutritionTemplateSchema,
} from '../database/models/nutrition-template.model';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from '../database/models/scheduled-session.model';
import { UserRepository } from '../repositories/user.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { OwnerPeopleController } from './owner-people.controller';
import { OwnerPeopleService } from './owner-people.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: PLAN_TEMPLATE_MODEL, schema: PlanTemplateSchema },
      { name: NUTRITION_TEMPLATE_MODEL, schema: NutritionTemplateSchema },
      { name: SCHEDULED_SESSION_MODEL, schema: ScheduledSessionSchema },
    ]),
  ],
  controllers: [OwnerPeopleController],
  providers: [
    OwnerPeopleService,
    UserRepository,
    WorkoutSessionRepository,
    PlanTemplateRepository,
    NutritionTemplateRepository,
    ScheduledSessionRepository,
  ],
})
export class OwnerPeopleModule {}
