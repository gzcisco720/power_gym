import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EQUIPMENT_MODEL,
  EquipmentSchema,
} from '../database/models/equipment.model';
import {
  CONDITION_REPORT_MODEL,
  ConditionReportSchema,
} from '../database/models/condition-report.model';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { ConditionReportRepository } from '../repositories/condition-report.repository';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EQUIPMENT_MODEL, schema: EquipmentSchema },
      { name: CONDITION_REPORT_MODEL, schema: ConditionReportSchema },
    ]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository, ConditionReportRepository],
})
export class EquipmentModule {}
