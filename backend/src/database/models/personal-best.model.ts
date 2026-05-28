import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IPersonalBest extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: Date;
  sessionId: Types.ObjectId;
}

export const PERSONAL_BEST_MODEL = 'PersonalBest';

export const PersonalBestSchema = new Schema<IPersonalBest>({
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
