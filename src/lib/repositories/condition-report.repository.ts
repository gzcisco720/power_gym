import mongoose from 'mongoose';
import { ConditionReportModel } from '@/lib/db/models/condition-report.model';
import type { IConditionReport } from '@/lib/db/models/condition-report.model';

export interface CreateConditionReportData {
  equipmentId: string;
  note: string;
}

export interface IConditionReportRepository {
  findByEquipmentId(equipmentId: string): Promise<IConditionReport[]>;
  create(data: CreateConditionReportData): Promise<IConditionReport>;
}

export class MongoConditionReportRepository implements IConditionReportRepository {
  async findByEquipmentId(equipmentId: string): Promise<IConditionReport[]> {
    return ConditionReportModel.find({ equipmentId: new mongoose.Types.ObjectId(equipmentId) }).sort({ reportedAt: -1 });
  }

  async create(data: CreateConditionReportData): Promise<IConditionReport> {
    return ConditionReportModel.create({
      equipmentId: new mongoose.Types.ObjectId(data.equipmentId),
      note: data.note,
    });
  }
}
