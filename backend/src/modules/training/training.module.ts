import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingDevController } from './training.dev.controller';
import {
  MemberPlan,
  MemberPlanSchema,
} from '../../common/models/member-plan.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';
import {
  PlanTemplate,
  PlanTemplateSchema,
} from '../../common/models/plan-template.model';
import { User, UserSchema } from '../../common/models/user.model';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [TrainingDevController] : [];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberPlan.name, schema: MemberPlanSchema },
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
      { name: PlanTemplate.name, schema: PlanTemplateSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TrainingController, ...devControllers],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
