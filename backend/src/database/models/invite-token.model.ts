import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IInviteToken extends Document {
  _id: Types.ObjectId;
  token: string;
  role: 'trainer' | 'member';
  invitedBy: Types.ObjectId;
  recipientEmail: string;
  expiresAt: Date;
  usedAt: Date | null;
  trainerId: Types.ObjectId | null;
}

export const INVITE_TOKEN_MODEL = 'InviteToken';

export const InviteTokenSchema = new Schema<IInviteToken>({
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ['trainer', 'member'], required: true },
  invitedBy: { type: Schema.Types.ObjectId, required: true },
  recipientEmail: { type: String, required: true, lowercase: true, trim: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  trainerId: { type: Schema.Types.ObjectId, default: null },
});

InviteTokenSchema.index({ invitedBy: 1, expiresAt: -1 });
InviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
