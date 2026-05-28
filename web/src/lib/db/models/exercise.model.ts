import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds: mongoose.Types.ObjectId[];
  bodyParts: string[];
  createdAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    muscleGroup: { type: String, default: null },
    isGlobal: { type: Boolean, required: true, default: false },
    createdBy: { type: Schema.Types.ObjectId, default: null },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    equipmentIds: { type: [Schema.Types.ObjectId], ref: 'Equipment', default: [] },
    bodyParts: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ExerciseSchema.index({ name: 1, createdBy: 1 }, { unique: true });
ExerciseSchema.index({ isGlobal: 1 });
ExerciseSchema.index({ createdBy: 1 });

export const ExerciseModel: Model<IExercise> =
  mongoose.models.Exercise ?? mongoose.model<IExercise>('Exercise', ExerciseSchema);
