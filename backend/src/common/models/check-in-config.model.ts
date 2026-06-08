import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CheckInConfigDocument = HydratedDocument<CheckInConfig>;

@Schema({ collection: 'CheckInConfig', timestamps: true })
export class CheckInConfig {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  trainerId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0, max: 6 })
  dayOfWeek: number;

  @Prop({ type: Number, required: true, min: 0, max: 23 })
  hour: number;

  @Prop({ type: Number, required: true, min: 0, max: 59, default: 0 })
  minute: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: Date, default: null })
  reminderSentAt: Date | null;
}

export const CheckInConfigSchema = SchemaFactory.createForClass(CheckInConfig);
CheckInConfigSchema.index({ memberId: 1 }, { unique: true });
CheckInConfigSchema.index({
  dayOfWeek: 1,
  hour: 1,
  active: 1,
  reminderSentAt: 1,
});
