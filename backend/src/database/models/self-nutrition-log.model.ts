import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ISelfMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  transFat?: number;
}

export interface ISelfMeal {
  name: string;
  order: number;
  completed: boolean;
  items: ISelfMealItem[];
}

export interface ISelfNutritionLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string;
  sourceTemplateId: Types.ObjectId | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const SELF_NUTRITION_LOG_MODEL = 'SelfNutritionLog';

const SelfMealItemSchema = new Schema<ISelfMealItem>(
  {
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    fiber: { type: Number },
    sugar: { type: Number },
    salt: { type: Number },
    saturated: { type: Number },
    polyunsaturated: { type: Number },
    monounsaturated: { type: Number },
    polyols: { type: Number },
    cholesterol: { type: Number },
    sodium: { type: Number },
    potassium: { type: Number },
    transFat: { type: Number },
  },
  { _id: false },
);

const SelfMealSchema = new Schema<ISelfMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    completed: { type: Boolean, required: true, default: false },
    items: [SelfMealItemSchema],
  },
  { _id: false },
);

export const SelfNutritionLogSchema = new Schema<ISelfNutritionLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    sourceTemplateId: { type: Schema.Types.ObjectId, default: null },
    sourceTemplateDayTypeName: { type: String, default: null },
    dayLabel: { type: String, required: true },
    meals: [SelfMealSchema],
    dayCompleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

SelfNutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true });
