import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ISelfWorkoutSet {
  exerciseId: Types.ObjectId;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number | null;
  prescribedRepsMax: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: Date | null;
}

export interface ISelfWorkoutLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  startedAt: Date;
  completedAt: Date | null;
  lastActivityAt: Date;
  autoSealed: boolean;
  sourceTemplateId: Types.ObjectId | null;
  sourceTemplateDayNumber: number | null;
  dayName: string;
  sets: ISelfWorkoutSet[];
  rpe: number | null;
  note: string | null;
}

export const SELF_WORKOUT_LOG_MODEL = 'SelfWorkoutLog';

export const SelfWorkoutSetSchema = new Schema<ISelfWorkoutSet>(
  {
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    isBodyweight: { type: Boolean, required: true, default: false },
    setNumber: { type: Number, required: true },
    prescribedRepsMin: { type: Number, default: null },
    prescribedRepsMax: { type: Number, default: null },
    actualWeight: { type: Number, default: null },
    actualReps: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

export const SelfWorkoutLogSchema = new Schema<ISelfWorkoutLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, required: true },
    autoSealed: { type: Boolean, required: true, default: false },
    sourceTemplateId: { type: Schema.Types.ObjectId, default: null },
    sourceTemplateDayNumber: { type: Number, default: null },
    dayName: { type: String, required: true },
    sets: [SelfWorkoutSetSchema],
    rpe: { type: Number, default: null },
    note: { type: String, default: null },
  },
  { timestamps: false },
);

SelfWorkoutLogSchema.index({ userId: 1, startedAt: -1 });
SelfWorkoutLogSchema.index({ userId: 1, completedAt: 1 });
SelfWorkoutLogSchema.index({ completedAt: 1, lastActivityAt: 1 });
