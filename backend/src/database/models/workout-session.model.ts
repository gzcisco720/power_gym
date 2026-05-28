import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ISessionSet {
  exerciseId: Types.ObjectId;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  isExtraSet: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: Date | null;
}

export interface IWorkoutSession extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  memberPlanId: Types.ObjectId;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  completedAt: Date | null;
  lastActivityAt: Date;
  autoSealed: boolean;
  sets: ISessionSet[];
  loggedBy: Types.ObjectId | null;
  rpe: number | null;
  memberNote: string | null;
}

export const WORKOUT_SESSION_MODEL = 'WorkoutSession';

export const SessionSetSchema = new Schema<ISessionSet>(
  {
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    isBodyweight: { type: Boolean, required: true, default: false },
    setNumber: { type: Number, required: true },
    prescribedRepsMin: { type: Number, required: true },
    prescribedRepsMax: { type: Number, required: true },
    isExtraSet: { type: Boolean, required: true, default: false },
    actualWeight: { type: Number, default: null },
    actualReps: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

export const WorkoutSessionSchema = new Schema<IWorkoutSession>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    memberPlanId: { type: Schema.Types.ObjectId, required: true },
    dayNumber: { type: Number, required: true },
    dayName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, required: true },
    autoSealed: { type: Boolean, required: true, default: false },
    sets: [SessionSetSchema],
    loggedBy: { type: Schema.Types.ObjectId, default: null },
    rpe: { type: Number, default: null },
    memberNote: { type: String, default: null },
  },
  { timestamps: false },
);

WorkoutSessionSchema.index({ memberId: 1, startedAt: -1 });
WorkoutSessionSchema.index({ memberId: 1, completedAt: 1 });
WorkoutSessionSchema.index({ completedAt: 1, lastActivityAt: 1 });
