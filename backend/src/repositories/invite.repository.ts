import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  IInviteToken,
  INVITE_TOKEN_MODEL,
} from '../database/models/invite-token.model';
import { INVITE_TTL_MS } from '../common/constants';

export interface CreateInviteData {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
  expiresAt: Date;
  trainerId?: string | null;
}

@Injectable()
export class InviteRepository {
  constructor(
    @InjectModel(INVITE_TOKEN_MODEL)
    private readonly inviteModel: Model<IInviteToken>,
  ) {}

  async findByToken(token: string): Promise<IInviteToken | null> {
    return this.inviteModel.findOne({ token });
  }

  async findById(id: string): Promise<IInviteToken | null> {
    return this.inviteModel.findById(id);
  }

  async findAll(): Promise<IInviteToken[]> {
    return this.inviteModel.find().sort({ createdAt: -1 });
  }

  async findByInvitedBy(invitedBy: string): Promise<IInviteToken[]> {
    return this.inviteModel
      .find({ invitedBy: new Types.ObjectId(invitedBy) })
      .sort({ createdAt: -1 });
  }

  async create(data: CreateInviteData): Promise<IInviteToken> {
    const invite = new this.inviteModel({
      token: data.token,
      role: data.role,
      invitedBy: new Types.ObjectId(data.invitedBy),
      recipientEmail: data.recipientEmail.toLowerCase().trim(),
      expiresAt: data.expiresAt,
      trainerId: data.trainerId ? new Types.ObjectId(data.trainerId) : null,
    });
    return invite.save();
  }

  async markUsed(token: string): Promise<void> {
    await this.inviteModel.findOneAndUpdate(
      { token },
      { $set: { usedAt: new Date() } },
    );
  }

  async countPending(now: Date): Promise<number> {
    return this.inviteModel.countDocuments({
      usedAt: null,
      expiresAt: { $gt: now },
    });
  }

  async regenerate(id: string): Promise<IInviteToken> {
    const updated = await this.inviteModel.findByIdAndUpdate(
      id,
      {
        $set: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          usedAt: null,
        },
      },
      { returnDocument: 'after' },
    );
    if (!updated) {
      throw new NotFoundException('Invite not found');
    }
    return updated;
  }

  async revoke(id: string): Promise<void> {
    await this.inviteModel.findByIdAndDelete(id);
  }
}
