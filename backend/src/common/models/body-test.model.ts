import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BodyTestDocument = HydratedDocument<BodyTest>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class BodyTest {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  trainerId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  age: number;

  @Prop({ type: String, enum: ['male', 'female'], required: true })
  sex: 'male' | 'female';

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({
    type: String,
    enum: ['3site', '7site', '9site', 'other'],
    required: true,
  })
  protocol: '3site' | '7site' | '9site' | 'other';

  @Prop({ type: Number, default: null })
  tricep: number | null;

  @Prop({ type: Number, default: null })
  chest: number | null;

  @Prop({ type: Number, default: null })
  subscapular: number | null;

  @Prop({ type: Number, default: null })
  abdominal: number | null;

  @Prop({ type: Number, default: null })
  suprailiac: number | null;

  @Prop({ type: Number, default: null })
  thigh: number | null;

  @Prop({ type: Number, default: null })
  midaxillary: number | null;

  @Prop({ type: Number, default: null })
  bicep: number | null;

  @Prop({ type: Number, default: null })
  lumbar: number | null;

  @Prop({ type: Number, required: true })
  bodyFatPct: number;

  @Prop({ type: Number, required: true })
  leanMassKg: number;

  @Prop({ type: Number, required: true })
  fatMassKg: number;

  @Prop({ type: Number, default: null })
  targetWeight: number | null;

  @Prop({ type: Number, default: null })
  targetBodyFatPct: number | null;
}

export const BodyTestSchema = SchemaFactory.createForClass(BodyTest);
BodyTestSchema.index({ memberId: 1, date: -1 });
