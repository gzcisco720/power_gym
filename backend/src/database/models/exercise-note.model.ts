import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IExerciseNoteEntry {
  _id: Types.ObjectId;
  content: string;
  sessionId: Types.ObjectId | null;
  createdAt: Date;
}

export interface IExerciseNote extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  exerciseName: string;
  trainerId: Types.ObjectId;
  entries: IExerciseNoteEntry[];
}

export const EXERCISE_NOTE_MODEL = 'ExerciseNote';

export const ExerciseNoteEntrySchema = new Schema<IExerciseNoteEntry>(
  {
    content: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, required: true },
  },
  { _id: true },
);

export const ExerciseNoteSchema = new Schema<IExerciseNote>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    entries: [ExerciseNoteEntrySchema],
  },
  { timestamps: false },
);

ExerciseNoteSchema.index({ memberId: 1, exerciseId: 1 });
