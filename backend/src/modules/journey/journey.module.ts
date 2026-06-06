import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { JourneyDevController } from './journey.dev.controller';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';
import {
  NutritionDailyLog,
  NutritionDailyLogSchema,
} from '../../common/models/nutrition-daily-log.model';
import { BodyTest, BodyTestSchema } from '../../common/models/body-test.model';
import { User, UserSchema } from '../../common/models/user.model';
import {
  MemberNutritionPlan,
  MemberNutritionPlanSchema,
} from '../../common/models/member-nutrition-plan.model';
import {
  CheckIn,
  CheckInSchema,
} from '../../common/models/check-in.model';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [JourneyDevController] : [];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
      { name: NutritionDailyLog.name, schema: NutritionDailyLogSchema },
      { name: BodyTest.name, schema: BodyTestSchema },
      { name: User.name, schema: UserSchema },
      {
        name: MemberNutritionPlan.name,
        schema: MemberNutritionPlanSchema,
      },
      { name: CheckIn.name, schema: CheckInSchema },
    ]),
  ],
  controllers: [JourneyController, ...devControllers],
  providers: [JourneyService],
})
export class JourneyModule {}
