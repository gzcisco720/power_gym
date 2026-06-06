import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { NutritionDevController } from './nutrition.dev.controller';
import {
  MemberNutritionPlan,
  MemberNutritionPlanSchema,
} from '../../common/models/member-nutrition-plan.model';
import {
  NutritionDailyLog,
  NutritionDailyLogSchema,
} from '../../common/models/nutrition-daily-log.model';
import {
  NutritionTemplate,
  NutritionTemplateSchema,
} from '../nutrition-templates/nutrition-template.model';
import { User, UserSchema } from '../../common/models/user.model';
import {
  SelfNutritionLog,
  SelfNutritionLogSchema,
} from '../../common/models/self-nutrition-log.model';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [NutritionDevController] : [];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberNutritionPlan.name, schema: MemberNutritionPlanSchema },
      { name: NutritionDailyLog.name, schema: NutritionDailyLogSchema },
      { name: NutritionTemplate.name, schema: NutritionTemplateSchema },
      { name: User.name, schema: UserSchema },
      { name: SelfNutritionLog.name, schema: SelfNutritionLogSchema },
    ]),
  ],
  controllers: [NutritionController, ...devControllers],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
