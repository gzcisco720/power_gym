import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InviteTokenDocument = HydratedDocument<InviteToken>;

@Schema()
export class InviteToken {
  @Prop({ type: String, required: true, unique: true })
  token: string;

  @Prop({ type: String, enum: ['trainer', 'member'], required: true })
  role: 'trainer' | 'member';

  @Prop({ type: Types.ObjectId, required: true })
  invitedBy: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  recipientEmail: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  usedAt: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  trainerId: Types.ObjectId | null;
}

export const InviteTokenSchema = SchemaFactory.createForClass(InviteToken);
InviteTokenSchema.index({ invitedBy: 1, expiresAt: -1 });
