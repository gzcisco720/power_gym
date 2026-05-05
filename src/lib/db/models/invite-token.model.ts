import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInviteToken extends Document {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: mongoose.Types.ObjectId;
  recipientEmail: string;
  expiresAt: Date;
  usedAt: Date | null;
  trainerId: mongoose.Types.ObjectId | null;
}

const InviteTokenSchema = new Schema<IInviteToken>({
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

export const InviteTokenModel: Model<IInviteToken> =
  mongoose.models.InviteToken ??
  mongoose.model<IInviteToken>('InviteToken', InviteTokenSchema);
