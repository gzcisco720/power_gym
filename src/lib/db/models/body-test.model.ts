import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBodyTest extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  tricep: number | null;
  chest: number | null;
  subscapular: number | null;
  abdominal: number | null;
  suprailiac: number | null;
  thigh: number | null;
  midaxillary: number | null;
  bicep: number | null;
  lumbar: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
  createdAt: Date;
}

const BodyTestSchema = new Schema<IBodyTest>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    date: { type: Date, required: true },
    age: { type: Number, required: true },
    sex: { type: String, enum: ['male', 'female'], required: true },
    weight: { type: Number, required: true },
    protocol: { type: String, enum: ['3site', '7site', '9site', 'other'], required: true },
    tricep: { type: Number, default: null },
    chest: { type: Number, default: null },
    subscapular: { type: Number, default: null },
    abdominal: { type: Number, default: null },
    suprailiac: { type: Number, default: null },
    thigh: { type: Number, default: null },
    midaxillary: { type: Number, default: null },
    bicep: { type: Number, default: null },
    lumbar: { type: Number, default: null },
    bodyFatPct: { type: Number, required: true },
    leanMassKg: { type: Number, required: true },
    fatMassKg: { type: Number, required: true },
    targetWeight: { type: Number, default: null },
    targetBodyFatPct: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BodyTestSchema.index({ memberId: 1, date: -1 });

export const BodyTestModel: Model<IBodyTest> =
  mongoose.models.BodyTest ?? mongoose.model<IBodyTest>('BodyTest', BodyTestSchema);
