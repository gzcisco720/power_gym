import crypto from 'crypto';
import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';

export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export interface CreateInviteData {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
  expiresAt: Date;
  trainerId?: string;
}

export interface IInviteRepository {
  findByToken(token: string): Promise<IInviteToken | null>;
  findById(id: string): Promise<IInviteToken | null>;
  create(data: CreateInviteData): Promise<IInviteToken>;
  markUsed(token: string): Promise<void>;
  findAll(): Promise<IInviteToken[]>;
  findByInvitedBy(userId: string): Promise<IInviteToken[]>;
  revoke(inviteId: string): Promise<void>;
  regenerate(inviteId: string): Promise<IInviteToken>;
  countPending(now: Date): Promise<number>;
}

export class MongoInviteRepository implements IInviteRepository {
  async findByToken(token: string): Promise<IInviteToken | null> {
    return InviteTokenModel.findOne({ token });
  }

  async create(data: CreateInviteData): Promise<IInviteToken> {
    const invite = new InviteTokenModel(data);
    return invite.save();
  }

  async markUsed(token: string): Promise<void> {
    await InviteTokenModel.findOneAndUpdate({ token }, { $set: { usedAt: new Date() } });
  }

  async findById(id: string): Promise<IInviteToken | null> {
    return InviteTokenModel.findById(id);
  }

  async findAll(): Promise<IInviteToken[]> {
    return InviteTokenModel.find({}).sort({ expiresAt: -1 });
  }

  async findByInvitedBy(userId: string): Promise<IInviteToken[]> {
    return InviteTokenModel.find({ invitedBy: userId }).sort({ expiresAt: -1 });
  }

  async revoke(inviteId: string): Promise<void> {
    await InviteTokenModel.findOneAndDelete({ _id: inviteId });
  }

  async countPending(now: Date): Promise<number> {
    return InviteTokenModel.countDocuments({ usedAt: null, expiresAt: { $gt: now } });
  }

  async regenerate(inviteId: string): Promise<IInviteToken> {
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const updated = await InviteTokenModel.findOneAndUpdate(
      { _id: inviteId },
      { $set: { token: newToken, expiresAt: newExpiresAt, usedAt: null } },
      { new: true },
    );
    if (!updated) throw new Error(`Invite ${inviteId} not found`);
    return updated;
  }
}
