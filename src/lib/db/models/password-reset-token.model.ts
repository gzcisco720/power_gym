import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

PasswordResetTokenSchema.index({ tokenHash: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ??
  mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
