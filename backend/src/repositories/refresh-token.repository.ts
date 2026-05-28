import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  IRefreshToken,
  REFRESH_TOKEN_MODEL,
} from '../database/models/refresh-token.model';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(REFRESH_TOKEN_MODEL)
    private readonly refreshModel: Model<IRefreshToken>,
  ) {}

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<IRefreshToken> {
    return this.refreshModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashToken(token),
      expiresAt,
    });
  }

  async findActiveByToken(token: string): Promise<IRefreshToken | null> {
    return this.refreshModel.findOne({
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async revokeByToken(token: string): Promise<void> {
    await this.refreshModel.findOneAndUpdate(
      { tokenHash: hashToken(token), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}
