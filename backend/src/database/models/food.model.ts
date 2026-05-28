import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IFoodServing {
  label: string;
  grams: number;
}

export interface IFoodMacros {
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

export interface IFood extends Document {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  name: string;
  brand: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
  createdAt: Date;
}

export const FOOD_MODEL = 'Food';

const ServingSchema = new Schema<IFoodServing>(
  {
    label: { type: String, required: true },
    grams: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const MacrosSchema = new Schema<IFoodMacros>(
  {
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

export const FoodSchema = new Schema<IFood>(
  {
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: null },
    macrosPer100g: { type: MacrosSchema, required: true },
    servings: [ServingSchema],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['__v'];
        return ret;
      },
    },
  },
);

FoodSchema.index({ createdBy: 1, name: 1 });
