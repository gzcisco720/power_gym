import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type MedicationDuration = 'long_term' | 'short_term';
export type MedicationStatus = 'active' | 'ended';

export interface IMemberMedication extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  status: MedicationStatus;
  createdAt: Date;
}

export const MEMBER_MEDICATION_MODEL = 'MemberMedication';

export const MemberMedicationSchema = new Schema<IMemberMedication>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    duration: {
      type: String,
      enum: ['long_term', 'short_term'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    notes: { type: String, default: null },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MemberMedicationSchema.index({ memberId: 1, status: 1 });
