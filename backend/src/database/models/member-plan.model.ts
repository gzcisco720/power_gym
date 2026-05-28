import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';
import type { IPlanDay } from './plan-template.model';
import { PlanDaySchema } from './plan-template.model';

export interface IMemberPlan extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  trainerId: Types.ObjectId;
  templateId: Types.ObjectId;
  name: string;
  days: IPlanDay[];
  isActive: boolean;
  assignedAt: Date;
}

export const MEMBER_PLAN_MODEL = 'MemberPlan';

export const MemberPlanSchema = new Schema<IMemberPlan>(
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
