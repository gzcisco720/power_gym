import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  createdBy: mongoose.Types.ObjectId | null;
  imageUrl: string | null;
  isBodyweight: boolean;
  equipmentIds: mongoose.Types.ObjectId[];
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
    equipmentIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ExerciseSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const ExerciseModel: Model<IExercise> =
  mongoose.models.Exercise ?? mongoose.model<IExercise>('Exercise', ExerciseSchema);
