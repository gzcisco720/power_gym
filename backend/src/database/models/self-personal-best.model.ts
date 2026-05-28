import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ISelfPersonalBest extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  logId: Types.ObjectId;
}

export const SELF_PERSONAL_BEST_MODEL = 'SelfPersonalBest';

export const SelfPersonalBestSchema = new Schema<ISelfPersonalBest>({
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
