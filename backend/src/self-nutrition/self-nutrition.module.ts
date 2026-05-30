import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SELF_NUTRITION_LOG_MODEL,
  SelfNutritionLogSchema,
} from '../database/models/self-nutrition-log.model';
import { SelfNutritionLogRepository } from '../repositories/self-nutrition-log.repository';
import { SelfNutritionService } from './self-nutrition.service';
import { SelfNutritionController } from './self-nutrition.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SELF_NUTRITION_LOG_MODEL, schema: SelfNutritionLogSchema },
    ]),
  ],
  controllers: [SelfNutritionController],
  providers: [SelfNutritionService, SelfNutritionLogRepository],
})
export class SelfNutritionModule {}
