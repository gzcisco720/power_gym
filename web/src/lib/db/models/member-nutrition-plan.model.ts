import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IDayType } from './nutrition-template.model';
import { DayTypeSchema } from './nutrition-template.model';

export interface IWeeklyPatternEntry {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayTypeName: string;
}

export interface ICalendarOverride {
  date: string;
  dayTypeName: string;
}

export interface ISchedule {
  weeklyPattern: IWeeklyPatternEntry[];
  calendarOverrides: ICalendarOverride[];
  iterate: boolean;
}

export interface IMemberNutritionPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  assignedById: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId | null;
  name: string;
  isActive: boolean;
  assignedAt: Date;
  deactivatedAt: Date | null;
  dayTypes: IDayType[];
  schedule: ISchedule;
}

const WeeklyPatternEntrySchema = new Schema<IWeeklyPatternEntry>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const CalendarOverrideSchema = new Schema<ICalendarOverride>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayTypeName: { type: String, required: true },
  },
  { _id: false },
);

const ScheduleSchema = new Schema<ISchedule>(
  {
    weeklyPattern: { type: [WeeklyPatternEntrySchema], default: [] },
    calendarOverrides: { type: [CalendarOverrideSchema], default: [] },
    iterate: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const MemberNutritionPlanSchema = new Schema<IMemberNutritionPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    assignedById: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
    deactivatedAt: { type: Date, default: null },
    dayTypes: [DayTypeSchema],
    schedule: { type: ScheduleSchema, default: () => ({ weeklyPattern: [], calendarOverrides: [], iterate: true }) },
  },
  { timestamps: false },
);

MemberNutritionPlanSchema.index({ memberId: 1, isActive: 1 });
MemberNutritionPlanSchema.index({ memberId: 1, assignedAt: -1 });

export const MemberNutritionPlanModel: Model<IMemberNutritionPlan> =
  mongoose.models.MemberNutritionPlan ??
  mongoose.model<IMemberNutritionPlan>('MemberNutritionPlan', MemberNutritionPlanSchema);
