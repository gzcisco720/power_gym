import { PasswordResetTokenModel } from '@/lib/db/models/password-reset-token.model';
import type { IPasswordResetToken } from '@/lib/db/models/password-reset-token.model';
import mongoose from 'mongoose';

export interface IPasswordResetTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<IPasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<IPasswordResetToken | null>;
  findValidByUserId(userId: string): Promise<IPasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
}

export class MongoPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<IPasswordResetToken> {
    return PasswordResetTokenModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      tokenHash,
      expiresAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<IPasswordResetToken | null> {
    return PasswordResetTokenModel.findOne({ tokenHash });
  }

  async findValidByUserId(userId: string): Promise<IPasswordResetToken | null> {
    return PasswordResetTokenModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ expiresAt: -1 });
  }

  async markUsed(id: string): Promise<void> {
    await PasswordResetTokenModel.findByIdAndUpdate(id, { $set: { usedAt: new Date() } });
  }
}
