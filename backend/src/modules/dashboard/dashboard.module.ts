import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { OwnerDashboardService } from './owner-dashboard.service';
import { TrainerDashboardService } from './trainer-dashboard.service';
import { MemberDashboardService } from './member-dashboard.service';
import { User, UserSchema } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';
import {
  ScheduledSession,
  ScheduledSessionSchema,
} from '../../common/models/scheduled-session.model';
import { CheckIn, CheckInSchema } from '../../common/models/check-in.model';
import {
  Equipment,
  EquipmentSchema,
} from '../../common/models/equipment.model';
import {
  InviteToken,
  InviteTokenSchema,
} from '../../common/models/invite-token.model';
import {
  PersonalBest,
  PersonalBestSchema,
} from '../../common/models/personal-best.model';
import {
  MemberPlan,
  MemberPlanSchema,
} from '../../common/models/member-plan.model';
import {
  MemberNutritionPlan,
  MemberNutritionPlanSchema,
} from '../../common/models/member-nutrition-plan.model';
import { BodyTest, BodyTestSchema } from '../../common/models/body-test.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
      { name: ScheduledSession.name, schema: ScheduledSessionSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: Equipment.name, schema: EquipmentSchema },
      { name: InviteToken.name, schema: InviteTokenSchema },
      { name: PersonalBest.name, schema: PersonalBestSchema },
      { name: MemberPlan.name, schema: MemberPlanSchema },
      { name: MemberNutritionPlan.name, schema: MemberNutritionPlanSchema },
      { name: BodyTest.name, schema: BodyTestSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    OwnerDashboardService,
    TrainerDashboardService,
    MemberDashboardService,
  ],
})
export class DashboardModule {}
