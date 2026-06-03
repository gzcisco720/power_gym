import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MedicationDuration = 'long_term' | 'short_term';
export type MedicationStatus = 'active' | 'ended';

export type MemberMedicationDocument = HydratedDocument<MemberMedication>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class MemberMedication {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, trim: true })
  purpose: string;

  @Prop({ type: String, enum: ['long_term', 'short_term'], required: true })
  duration: MedicationDuration;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, enum: ['active', 'ended'], default: 'active' })
  status: MedicationStatus;
}

export const MemberMedicationSchema =
  SchemaFactory.createForClass(MemberMedication);
MemberMedicationSchema.index({ memberId: 1, status: 1 });
