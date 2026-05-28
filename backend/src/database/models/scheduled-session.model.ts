import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IScheduledSession extends Document {
  _id: Types.ObjectId;
  seriesId: Types.ObjectId | null;
  trainerId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SCHEDULED_SESSION_MODEL = 'ScheduledSession';

export const ScheduledSessionSchema = new Schema<IScheduledSession>(
  {
    seriesId: { type: Schema.Types.ObjectId, default: null },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    memberIds: { type: [Schema.Types.ObjectId], default: [] },
    date: { type: Date, required: true },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled',
    },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ScheduledSessionSchema.index({ date: 1, trainerId: 1 });
ScheduledSessionSchema.index({ memberIds: 1, date: 1 });
