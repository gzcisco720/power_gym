import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NUTRITION_TEMPLATE_MODEL,
  NutritionTemplateSchema,
} from '../database/models/nutrition-template.model';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import { NutritionTemplatesController } from './nutrition-templates.controller';
import { NutritionTemplatesService } from './nutrition-templates.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NUTRITION_TEMPLATE_MODEL, schema: NutritionTemplateSchema },
    ]),
  ],
  controllers: [NutritionTemplatesController],
  providers: [NutritionTemplatesService, NutritionTemplateRepository],
})
export class NutritionTemplatesModule {}
