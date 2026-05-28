import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExerciseNoteEntry {
  _id: mongoose.Types.ObjectId;
  content: string;
  sessionId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

export interface IExerciseNote extends Document {
  memberId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  trainerId: mongoose.Types.ObjectId;
  entries: IExerciseNoteEntry[];
}

const ExerciseNoteEntrySchema = new Schema<IExerciseNoteEntry>(
  {
    content: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, required: true },
  },
  { _id: true },
);

const ExerciseNoteSchema = new Schema<IExerciseNote>(
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

export const ExerciseNoteModel: Model<IExerciseNote> =
  mongoose.models.ExerciseNote ??
  mongoose.model<IExerciseNote>('ExerciseNote', ExerciseNoteSchema);
