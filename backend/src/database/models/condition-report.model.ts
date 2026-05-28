import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IConditionReport extends Document {
  _id: Types.ObjectId;
  equipmentId: Types.ObjectId;
  note: string;
  reportedAt: Date;
}

export const CONDITION_REPORT_MODEL = 'ConditionReport';

export const ConditionReportSchema = new Schema<IConditionReport>(
  {
    equipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    note: { type: String, required: true, trim: true },
    reportedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

ConditionReportSchema.index({ equipmentId: 1, reportedAt: -1 });
