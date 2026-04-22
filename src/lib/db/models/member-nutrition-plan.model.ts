import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IDayType } from './nutrition-template.model';

export interface IMemberNutritionPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  assignedAt: Date;
  dayTypes: IDayType[];
}

const MealItemSchema = new Schema(
  {
    foodId: { type: Schema.Types.ObjectId, required: true },
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const MealSchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

const DayTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    targetKcal: { type: Number, required: true },
    targetProtein: { type: Number, required: true },
    targetCarbs: { type: Number, required: true },
    targetFat: { type: Number, required: true },
    meals: [MealSchema],
  },
  { _id: false },
);

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
