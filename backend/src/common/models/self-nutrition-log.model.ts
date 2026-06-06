import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface SelfNutritionItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type SelfNutritionLogDocument = SelfNutritionLog & Document;

@Schema({ timestamps: true, collection: 'selfnutritionlogs' })
export class SelfNutritionLog {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  date: string;

  @Prop({
    type: [
      {
        foodName: { type: String, required: true },
        quantityG: { type: Number, required: true },
        kcal: { type: Number, required: true },
        protein: { type: Number, required: true },
        carbs: { type: Number, required: true },
        fat: { type: Number, required: true },
        _id: false,
      },
    ],
    default: [],
  })
  items: SelfNutritionItem[];
}

export const SelfNutritionLogSchema =
  SchemaFactory.createForClass(SelfNutritionLog);

SelfNutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true });
