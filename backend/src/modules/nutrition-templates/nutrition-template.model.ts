import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NutritionTemplateDocument = HydratedDocument<NutritionTemplate>;

const MealItemSchema = new MongooseSchema(
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

const MealSchema = new MongooseSchema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

const DayTypeSchema = new MongooseSchema(
  {
    name: { type: String, required: true },
    meals: [MealSchema],
  },
  { _id: false },
);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class NutritionTemplate {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [DayTypeSchema], default: [] })
  dayTypes: {
    name: string;
    meals: {
      name: string;
      order: number;
      items: {
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
      }[];
    }[];
  }[];
}

export const NutritionTemplateSchema =
  SchemaFactory.createForClass(NutritionTemplate);
NutritionTemplateSchema.index({ createdBy: 1 });
