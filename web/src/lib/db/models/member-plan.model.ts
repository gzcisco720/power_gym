import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IPlanDay } from './plan-template.model';
import { PlanDaySchema } from './plan-template.model';

export interface IMemberPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  days: IPlanDay[];
  isActive: boolean;
  assignedAt: Date;
}

const MemberPlanSchema = new Schema<IMemberPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    days: [PlanDaySchema],
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

MemberPlanSchema.index({ memberId: 1, isActive: 1 });

export const MemberPlanModel: Model<IMemberPlan> =
  mongoose.models.MemberPlan ??
  mongoose.model<IMemberPlan>('MemberPlan', MemberPlanSchema);
