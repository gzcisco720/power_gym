import mongoose, { Document, Model, Schema } from 'mongoose';
import { MealItemSchema, type IMealItem } from './nutrition-template.model';

export interface IDailyLogMeal {
  name: string;
  order: number;
  completed: boolean;
  items: IMealItem[];
}

export interface INutritionDailyLog extends Document {
  memberId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogMealSchema = new Schema<IDailyLogMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    completed: { type: Boolean, required: true, default: false },
    items: [MealItemSchema],
  },
  { _id: false },
);

const NutritionDailyLogSchema = new Schema<INutritionDailyLog>(
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

export const NutritionDailyLogModel: Model<INutritionDailyLog> =
  mongoose.models.NutritionDailyLog ??
  mongoose.model<INutritionDailyLog>('NutritionDailyLog', NutritionDailyLogSchema);
