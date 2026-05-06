import mongoose, { Document, Model, Schema } from 'mongoose';

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
  _id: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  brand: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
  createdAt: Date;
}

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
    fiber: Number,
    sugar: Number,
    salt: Number,
    saturated: Number,
    polyunsaturated: Number,
    monounsaturated: Number,
    polyols: Number,
    cholesterol: Number,
    sodium: Number,
    potassium: Number,
    transFat: Number,
  },
  { _id: false },
);

const FoodSchema = new Schema<IFood>(
  {
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: null },
    macrosPer100g: { type: MacrosSchema, required: true },
    servings: [ServingSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FoodSchema.index({ createdBy: 1, name: 1 });

export const FoodModel: Model<IFood> =
  mongoose.models.Food ?? mongoose.model<IFood>('Food', FoodSchema);
