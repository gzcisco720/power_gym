import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISelfWorkoutSet {
  exerciseId: mongoose.Types.ObjectId;
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
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  completedAt: Date | null;
  sourceTemplateId: mongoose.Types.ObjectId | null;
  sourceTemplateDayNumber: number | null;
  dayName: string;
  sets: ISelfWorkoutSet[];
  rpe: number | null;
  note: string | null;
}

const SelfWorkoutSetSchema = new Schema<ISelfWorkoutSet>(
  {
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    isBodyweight: { type: Boolean, required: true, default: false },
    setNumber: { type: Number, required: true },
    // Nullable: freestyle (ad-hoc) sets have no prescribed range; only template-derived sets do.
    prescribedRepsMin: { type: Number, default: null },
    prescribedRepsMax: { type: Number, default: null },
    actualWeight: { type: Number, default: null },
    actualReps: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const SelfWorkoutLogSchema = new Schema<ISelfWorkoutLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
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

export const SelfWorkoutLogModel: Model<ISelfWorkoutLog> =
  mongoose.models.SelfWorkoutLog ??
  mongoose.model<ISelfWorkoutLog>('SelfWorkoutLog', SelfWorkoutLogSchema);
