import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPer100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IPerServing {
  servingLabel: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IFood extends Document {
  name: string;
  brand: string | null;
  source: 'manual' | 'api';
  externalId: string | null;
  createdBy: mongoose.Types.ObjectId | null;
  isGlobal: boolean;
  per100g: IPer100g | null;
  perServing: IPerServing | null;
  createdAt: Date;
}

const Per100gSchema = new Schema<IPer100g>(
  {
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const PerServingSchema = new Schema<IPerServing>(
  {
    servingLabel: { type: String, required: true },
    grams: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const FoodSchema = new Schema<IFood>(
  {
    name: { type: String, required: true },
    brand: { type: String, default: null },
    source: { type: String, enum: ['manual', 'api'], required: true, default: 'manual' },
    externalId: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    isGlobal: { type: Boolean, required: true, default: false },
    per100g: { type: Per100gSchema, default: null },
    perServing: { type: PerServingSchema, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

FoodSchema.index({ name: 1, createdBy: 1 }, { unique: true });
FoodSchema.index({ isGlobal: 1 });
FoodSchema.index({ createdBy: 1 });

export const FoodModel: Model<IFood> =
  mongoose.models.Food ?? mongoose.model<IFood>('Food', FoodSchema);
