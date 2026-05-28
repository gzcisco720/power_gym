import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  IPasswordResetToken,
  PASSWORD_RESET_TOKEN_MODEL,
} from '../database/models/password-reset-token.model';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectModel(PASSWORD_RESET_TOKEN_MODEL)
    private readonly resetModel: Model<IPasswordResetToken>,
  ) {}

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<IPasswordResetToken> {
    return this.resetModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashToken(token),
      expiresAt,
    });
  }

  async findValidByToken(token: string): Promise<IPasswordResetToken | null> {
    return this.resetModel.findOne({
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async findValidByUserId(userId: string): Promise<IPasswordResetToken | null> {
    return this.resetModel
      .findOne({
        userId: new Types.ObjectId(userId),
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ expiresAt: -1 });
  }

  async markUsed(id: string): Promise<void> {
    await this.resetModel.findByIdAndUpdate(id, {
      $set: { usedAt: new Date() },
    });
  }
}
