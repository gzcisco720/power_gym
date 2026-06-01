import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MemberNutritionPlanDocument = HydratedDocument<MemberNutritionPlan>;

// Minimal sub-schemas matching web/src/lib/db/models/member-nutrition-plan.model.ts
const WeeklyPatternEntrySchema = new MongooseSchema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const CalendarOverrideSchema = new MongooseSchema(
  {
    date: { type: String, required: true },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const ScheduleSchema = new MongooseSchema(
  {
    weeklyPattern: { type: [WeeklyPatternEntrySchema], default: [] },
    calendarOverrides: { type: [CalendarOverrideSchema], default: [] },
    iterate: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

// Minimal nutrition day-type schema (used for macro lookup)
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

interface WeeklyPatternEntry {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayTypeName: string;
}

interface CalendarOverride {
  date: string;
  dayTypeName: string;
}

interface Schedule {
  weeklyPattern: WeeklyPatternEntry[];
  calendarOverrides: CalendarOverride[];
  iterate: boolean;
}

interface MealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  name: string;
  order: number;
  items: MealItem[];
}

interface DayType {
  name: string;
  meals: Meal[];
}

@Schema({ timestamps: false })
export class MemberNutritionPlan {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  assignedById: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  templateId: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  @Prop({ type: Date, required: true })
  assignedAt: Date;

  @Prop({ type: Date, default: null })
  deactivatedAt: Date | null;

  @Prop({ type: [DayTypeSchema], default: [] })
  dayTypes: DayType[];

  @Prop({
    type: ScheduleSchema,
    default: () => ({
      weeklyPattern: [],
      calendarOverrides: [],
      iterate: true,
    }),
  })
  schedule: Schedule;
}

export const MemberNutritionPlanSchema =
  SchemaFactory.createForClass(MemberNutritionPlan);
MemberNutritionPlanSchema.index({ memberId: 1, isActive: 1 });
MemberNutritionPlanSchema.index({ memberId: 1, assignedAt: -1 });
