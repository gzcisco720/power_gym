import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IDayType } from './nutrition-template.model';
import { DayTypeSchema } from './nutrition-template.model';

export interface IMemberNutritionPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  assignedAt: Date;
  dayTypes: IDayType[];
}

const MemberNutritionPlanSchema = new Schema<IMemberNutritionPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
    dayTypes: [DayTypeSchema],
  },
  { timestamps: false },
);

MemberNutritionPlanSchema.index({ memberId: 1, isActive: 1 });

export const MemberNutritionPlanModel: Model<IMemberNutritionPlan> =
  mongoose.models.MemberNutritionPlan ??
  mongoose.model<IMemberNutritionPlan>('MemberNutritionPlan', MemberNutritionPlanSchema);
