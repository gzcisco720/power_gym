import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NutritionTemplatesController } from './nutrition-templates.controller';
import { NutritionTemplatesService } from './nutrition-templates.service';
import {
  NutritionTemplate,
  NutritionTemplateSchema,
} from './nutrition-template.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NutritionTemplate.name, schema: NutritionTemplateSchema },
    ]),
  ],
  controllers: [NutritionTemplatesController],
  providers: [NutritionTemplatesService],
})
export class NutritionTemplatesModule {}
