import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScheduledSessionDocument = HydratedDocument<ScheduledSession>;

@Schema({ timestamps: true })
export class ScheduledSession {
  @Prop({ type: Types.ObjectId, default: null })
  seriesId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: true })
  trainerId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  memberIds: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, required: true, match: /^\d{2}:\d{2}$/ })
  startTime: string;

  @Prop({ type: String, required: true, match: /^\d{2}:\d{2}$/ })
  endTime: string;

  @Prop({
    type: String,
    enum: ['scheduled', 'cancelled'],
    default: 'scheduled',
  })
  status: 'scheduled' | 'cancelled';

  @Prop({ type: Types.ObjectId, default: null })
  serviceTypeId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  customServiceName: string | null;

  @Prop({ type: Number, default: null })
  customFee: number | null;

  @Prop({ type: Date, default: null })
  reminderSentAt: Date | null;
}

export const ScheduledSessionSchema =
  SchemaFactory.createForClass(ScheduledSession);
ScheduledSessionSchema.index({ date: 1, trainerId: 1 });
ScheduledSessionSchema.index({ memberIds: 1, date: 1 });
