import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface ICheckInConfig extends Document {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  trainerId: Types.ObjectId;
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
  lastReminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CHECK_IN_CONFIG_MODEL = 'CheckInConfig';

export const CheckInConfigSchema = new Schema<ICheckInConfig>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    hour: { type: Number, required: true, min: 0, max: 23 },
    minute: { type: Number, required: true, min: 0, max: 59 },
    active: { type: Boolean, default: true },
    lastReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CheckInConfigSchema.index({ memberId: 1 }, { unique: true });
