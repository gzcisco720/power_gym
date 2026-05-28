import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FOOD_MODEL, FoodSchema } from '../database/models/food.model';
import {
  NUTRITION_TEMPLATE_MODEL,
  NutritionTemplateSchema,
} from '../database/models/nutrition-template.model';
import {
  MEMBER_NUTRITION_PLAN_MODEL,
  MemberNutritionPlanSchema,
} from '../database/models/member-nutrition-plan.model';
import {
  NUTRITION_DAILY_LOG_MODEL,
  NutritionDailyLogSchema,
} from '../database/models/nutrition-daily-log.model';
import {
  SELF_NUTRITION_LOG_MODEL,
  SelfNutritionLogSchema,
} from '../database/models/self-nutrition-log.model';
import { FoodRepository } from '../repositories/food.repository';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import { NutritionDailyLogRepository } from '../repositories/nutrition-daily-log.repository';
import { SelfNutritionLogRepository } from '../repositories/self-nutrition-log.repository';
import { UsersModule } from '../users/users.module';
import { FatSecretService } from './fatsecret/fatsecret.service';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FOOD_MODEL, schema: FoodSchema },
      { name: NUTRITION_TEMPLATE_MODEL, schema: NutritionTemplateSchema },
      {
        name: MEMBER_NUTRITION_PLAN_MODEL,
        schema: MemberNutritionPlanSchema,
      },
      { name: NUTRITION_DAILY_LOG_MODEL, schema: NutritionDailyLogSchema },
      { name: SELF_NUTRITION_LOG_MODEL, schema: SelfNutritionLogSchema },
    ]),
    UsersModule,
  ],
  controllers: [NutritionController],
  providers: [
    NutritionService,
    FatSecretService,
    FoodRepository,
    NutritionTemplateRepository,
    MemberNutritionPlanRepository,
    NutritionDailyLogRepository,
    SelfNutritionLogRepository,
  ],
  exports: [NutritionService],
})
export class NutritionModule {}
