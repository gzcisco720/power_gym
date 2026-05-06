import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMealItem {
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
}

export interface IMeal {
  name: string;
  order: number;
  items: IMealItem[];
}

export interface IDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: IMeal[];
}

export interface INutritionTemplate extends Document {
  name: string;
  description: string | null;
  createdBy: mongoose.Types.ObjectId;
  dayTypes: IDayType[];
  createdAt: Date;
}

export const MealItemSchema = new Schema<IMealItem>(
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
  },
  { _id: false },
);

export const MealSchema = new Schema<IMeal>(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

export const DayTypeSchema = new Schema<IDayType>(
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

const NutritionTemplateSchema = new Schema<INutritionTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    dayTypes: [DayTypeSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const NutritionTemplateModel: Model<INutritionTemplate> =
  mongoose.models.NutritionTemplate ??
  mongoose.model<INutritionTemplate>('NutritionTemplate', NutritionTemplateSchema);
