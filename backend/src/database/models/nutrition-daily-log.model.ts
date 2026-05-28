import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';
import type { IMealItem } from './nutrition-template.model';
import { MealItemSchema } from './nutrition-template.model';

export interface IDailyLogMeal {
  name: string;
  order: number;
  completed: boolean;
  items: IMealItem[];
}

export interface INutritionDailyLog extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  planId: Types.ObjectId;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const NUTRITION_DAILY_LOG_MODEL = 'NutritionDailyLog';

const DailyLogMealSchema = new Schema<IDailyLogMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    completed: { type: Boolean, required: true, default: false },
    items: [MealItemSchema],
  },
  { _id: false },
);

export const NutritionDailyLogSchema = new Schema<INutritionDailyLog>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    planId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayTypeName: { type: String, required: true },
    meals: [DailyLogMealSchema],
    dayCompleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

NutritionDailyLogSchema.index({ memberId: 1, date: 1 }, { unique: true });
