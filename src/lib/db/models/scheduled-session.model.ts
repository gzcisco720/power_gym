import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IScheduledSession extends Document {
  seriesId: mongoose.Types.ObjectId | null;
  trainerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  date: Date;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledSessionSchema = new Schema<IScheduledSession>(
  {
    seriesId: { type: Schema.Types.ObjectId, default: null },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    memberIds: { type: [Schema.Types.ObjectId], default: [] },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ScheduledSessionSchema.index({ date: 1, trainerId: 1 });
ScheduledSessionSchema.index({ memberIds: 1, date: 1 });
ScheduledSessionSchema.index({ seriesId: 1, date: 1 });
ScheduledSessionSchema.index({ status: 1, date: 1, reminderSentAt: 1 });

export const ScheduledSessionModel: Model<IScheduledSession> =
  mongoose.models.ScheduledSession ??
  mongoose.model<IScheduledSession>('ScheduledSession', ScheduledSessionSchema);
