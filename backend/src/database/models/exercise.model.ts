import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IExercise extends Document {
  _id: Types.ObjectId;
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: Types.ObjectId | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds: Types.ObjectId[];
  bodyParts: string[];
  createdAt: Date;
}

export const EXERCISE_MODEL = 'Exercise';

export const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    muscleGroup: { type: String, default: null },
    isGlobal: { type: Boolean, required: true, default: false },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    equipmentIds: { type: [Schema.Types.ObjectId], default: [] },
    bodyParts: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ExerciseSchema.index({ name: 1, createdBy: 1 }, { unique: true });
ExerciseSchema.index({ isGlobal: 1 });
ExerciseSchema.index({ createdBy: 1 });
