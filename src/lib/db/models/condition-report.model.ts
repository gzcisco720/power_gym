import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IConditionReport extends Document {
  equipmentId: mongoose.Types.ObjectId;
  note: string;
  reportedAt: Date;
}

const ConditionReportSchema = new Schema<IConditionReport>(
  {
    equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true },
    note: { type: String, required: true, trim: true },
    reportedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

ConditionReportSchema.index({ equipmentId: 1, reportedAt: -1 });

if (mongoose.models.ConditionReport) {
  mongoose.deleteModel('ConditionReport');
}

export const ConditionReportModel: Model<IConditionReport> =
  mongoose.model<IConditionReport>('ConditionReport', ConditionReportSchema);
