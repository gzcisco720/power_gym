import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type FoodDocument = HydratedDocument<Food>;

const ServingSchema = new MongooseSchema(
  {
    label: { type: String, required: true },
    grams: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const MacrosSchema = new MongooseSchema(
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

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Food {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  brand: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  isGlobal: boolean;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: MacrosSchema, required: true })
  macrosPer100g: {
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
  };

  @Prop({ type: [ServingSchema], default: [] })
  servings: { label: string; grams: number }[];
}

export const FoodSchema = SchemaFactory.createForClass(Food);
FoodSchema.index({ createdBy: 1, name: 1 });
