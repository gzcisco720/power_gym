import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { User, UserSchema } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';
import {
  ScheduledSession,
  ScheduledSessionSchema,
} from '../../common/models/scheduled-session.model';
import {
  MemberPlan,
  MemberPlanSchema,
} from '../../common/models/member-plan.model';
import {
  PlanTemplate,
  PlanTemplateSchema,
} from '../../common/models/plan-template.model';
import {
  NutritionTemplate,
  NutritionTemplateSchema,
} from '../../modules/nutrition-templates/nutrition-template.model';
import {
  PersonalBest,
  PersonalBestSchema,
} from '../../common/models/personal-best.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
      { name: ScheduledSession.name, schema: ScheduledSessionSchema },
      { name: MemberPlan.name, schema: MemberPlanSchema },
      { name: PlanTemplate.name, schema: PlanTemplateSchema },
      { name: NutritionTemplate.name, schema: NutritionTemplateSchema },
      { name: PersonalBest.name, schema: PersonalBestSchema },
    ]),
  ],
  controllers: [TrainersController],
  providers: [TrainersService],
})
export class TrainersModule {}
