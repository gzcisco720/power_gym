import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NutritionDailyLogDocument = HydratedDocument<NutritionDailyLog>;

const MealItemSchema = new MongooseSchema(
  {
    foodName: { type: String, required: true },
    quantityG: { type: Number, required: true },
    kcal: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  { _id: false },
);

const DailyLogMealSchema = new MongooseSchema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true },
    items: [MealItemSchema],
  },
  { _id: false },
);

export interface DailyLogMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyLogMeal {
  name: string;
  order: number;
  items: DailyLogMealItem[];
}

@Schema({ timestamps: true })
export class NutritionDailyLog {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  planId: Types.ObjectId;

  @Prop({ type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  date: string;

  @Prop({ type: String, required: true })
  dayTypeName: string;

  @Prop({ type: [DailyLogMealSchema], default: [] })
  meals: DailyLogMeal[];
}

export const NutritionDailyLogSchema =
  SchemaFactory.createForClass(NutritionDailyLog);

NutritionDailyLogSchema.index({ memberId: 1, date: 1 }, { unique: true });
