import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PLAN_TEMPLATE_MODEL,
  PlanTemplateSchema,
} from '../database/models/plan-template.model';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { PlanTemplatesController } from './plan-templates.controller';
import { PlanTemplatesService } from './plan-templates.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PLAN_TEMPLATE_MODEL, schema: PlanTemplateSchema },
    ]),
  ],
  controllers: [PlanTemplatesController],
  providers: [PlanTemplatesService, PlanTemplateRepository],
})
export class PlanTemplatesModule {}
