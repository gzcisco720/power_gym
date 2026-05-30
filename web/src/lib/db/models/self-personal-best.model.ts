import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISelfPersonalBest extends Document {
  userId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  logId: mongoose.Types.ObjectId;
}

const SelfPersonalBestSchema = new Schema<ISelfPersonalBest>({
  userId: { type: Schema.Types.ObjectId, required: true },
  exerciseId: { type: Schema.Types.ObjectId, required: true },
  exerciseName: { type: String, required: true },
  bestWeight: { type: Number, required: true },
  bestReps: { type: Number, required: true },
  estimatedOneRM: { type: Number, required: true },
  achievedAt: { type: Date, required: true },
  logId: { type: Schema.Types.ObjectId, required: true },
});

SelfPersonalBestSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

export const SelfPersonalBestModel: Model<ISelfPersonalBest> =
  mongoose.models.SelfPersonalBest ??
  mongoose.model<ISelfPersonalBest>('SelfPersonalBest', SelfPersonalBestSchema);
