import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CheckInDocument = HydratedDocument<CheckIn>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class CheckIn {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  trainerId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  submittedAt: Date;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  sleepQuality: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  stress: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  fatigue: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  hunger: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  recovery: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  energy: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  digestion: number;

  @Prop({ type: Number, default: null })
  weight: number | null;

  @Prop({ type: Number, default: null })
  waist: number | null;

  @Prop({ type: Number, default: null })
  steps: number | null;

  @Prop({ type: Number, default: null })
  exerciseMinutes: number | null;

  @Prop({ type: Number, default: null })
  walkRunDistance: number | null;

  @Prop({ type: Number, default: null })
  sleepHours: number | null;

  @Prop({ type: String, default: '' })
  dietDetails: string;

  @Prop({ type: String, enum: ['yes', 'no', 'partial'], required: true })
  stuckToDiet: 'yes' | 'no' | 'partial';

  @Prop({ type: String, default: '' })
  wellbeing: string;

  @Prop({ type: String, default: '' })
  notes: string;

  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);
CheckInSchema.index({ memberId: 1, submittedAt: -1 });
CheckInSchema.index({ trainerId: 1, submittedAt: -1 });
