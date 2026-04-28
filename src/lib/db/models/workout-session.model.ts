import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISessionSet {
  exerciseId: mongoose.Types.ObjectId;
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
  memberId: mongoose.Types.ObjectId;
  memberPlanId: mongoose.Types.ObjectId;
  dayNumber: number;
  dayName: string;
  startedAt: Date;
  completedAt: Date | null;
  sets: ISessionSet[];
}

const SessionSetSchema = new Schema<ISessionSet>(
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

const WorkoutSessionSchema = new Schema<IWorkoutSession>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    memberPlanId: { type: Schema.Types.ObjectId, required: true },
    dayNumber: { type: Number, required: true },
    dayName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    sets: [SessionSetSchema],
  },
  { timestamps: false },
);

WorkoutSessionSchema.index({ memberId: 1, startedAt: -1 });
WorkoutSessionSchema.index({ memberId: 1, completedAt: 1 });

export const WorkoutSessionModel: Model<IWorkoutSession> =
  mongoose.models.WorkoutSession ??
  mongoose.model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);
