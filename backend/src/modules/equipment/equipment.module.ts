import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import {
  Equipment,
  EquipmentSchema,
} from '../../common/models/equipment.model';
import {
  ConditionReport,
  ConditionReportSchema,
} from '../../common/models/condition-report.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Equipment.name, schema: EquipmentSchema },
      { name: ConditionReport.name, schema: ConditionReportSchema },
    ]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
