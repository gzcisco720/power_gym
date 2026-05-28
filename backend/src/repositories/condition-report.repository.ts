import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IConditionReport,
  CONDITION_REPORT_MODEL,
} from '../database/models/condition-report.model';

export interface CreateConditionReportData {
  equipmentId: string;
  note: string;
}

@Injectable()
export class ConditionReportRepository {
  constructor(
    @InjectModel(CONDITION_REPORT_MODEL)
    private readonly model: Model<IConditionReport>,
  ) {}

  async findByEquipmentId(equipmentId: string): Promise<IConditionReport[]> {
    return this.model
      .find({ equipmentId: new Types.ObjectId(equipmentId) })
      .sort({ reportedAt: -1 });
  }

  async create(data: CreateConditionReportData): Promise<IConditionReport> {
    const doc = new this.model({
      equipmentId: new Types.ObjectId(data.equipmentId),
      note: data.note,
    });
    return doc.save();
  }
}
