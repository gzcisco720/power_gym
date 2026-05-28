import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICheckInConfig extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInConfigSchema = new Schema<ICheckInConfig>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    hour: { type: Number, required: true, min: 0, max: 23 },
    minute: { type: Number, required: true, min: 0, max: 59 },
    active: { type: Boolean, default: true },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CheckInConfigSchema.index({ memberId: 1 }, { unique: true });
CheckInConfigSchema.index({ dayOfWeek: 1, hour: 1, active: 1, reminderSentAt: 1 });

export const CheckInConfigModel: Model<ICheckInConfig> =
  mongoose.models.CheckInConfig ??
  mongoose.model<ICheckInConfig>('CheckInConfig', CheckInConfigSchema);
