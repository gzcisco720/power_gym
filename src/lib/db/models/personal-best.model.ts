import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPersonalBest extends Document {
  memberId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  sessionId: mongoose.Types.ObjectId;
}

const PersonalBestSchema = new Schema<IPersonalBest>({
  memberId: { type: Schema.Types.ObjectId, required: true },
  exerciseId: { type: Schema.Types.ObjectId, required: true },
  exerciseName: { type: String, required: true },
  bestWeight: { type: Number, required: true },
  bestReps: { type: Number, required: true },
  estimatedOneRM: { type: Number, required: true },
  achievedAt: { type: Date, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
});

PersonalBestSchema.index({ memberId: 1, exerciseId: 1 }, { unique: true });

export const PersonalBestModel: Model<IPersonalBest> =
  mongoose.models.PersonalBest ??
  mongoose.model<IPersonalBest>('PersonalBest', PersonalBestSchema);
