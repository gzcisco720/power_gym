import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ICheckIn extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  trainerId: Types.ObjectId;
  submittedAt: Date;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
  createdAt: Date;
}

export const CHECK_IN_MODEL = 'CheckIn';

export const CheckInSchema = new Schema<ICheckIn>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    submittedAt: { type: Date, required: true },
    sleepQuality: { type: Number, required: true, min: 1, max: 10 },
    stress: { type: Number, required: true, min: 1, max: 10 },
    fatigue: { type: Number, required: true, min: 1, max: 10 },
    hunger: { type: Number, required: true, min: 1, max: 10 },
    recovery: { type: Number, required: true, min: 1, max: 10 },
    energy: { type: Number, required: true, min: 1, max: 10 },
    digestion: { type: Number, required: true, min: 1, max: 10 },
    weight: { type: Number, default: null },
    waist: { type: Number, default: null },
    steps: { type: Number, default: null },
    exerciseMinutes: { type: Number, default: null },
    walkRunDistance: { type: Number, default: null },
    sleepHours: { type: Number, default: null },
    dietDetails: { type: String, default: '' },
    stuckToDiet: {
      type: String,
      enum: ['yes', 'no', 'partial'],
      required: true,
    },
    wellbeing: { type: String, default: '' },
    notes: { type: String, default: '' },
    photos: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CheckInSchema.index({ memberId: 1, submittedAt: -1 });
