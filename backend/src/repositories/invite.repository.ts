import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IInviteToken,
  INVITE_TOKEN_MODEL,
} from '../database/models/invite-token.model';

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
}
