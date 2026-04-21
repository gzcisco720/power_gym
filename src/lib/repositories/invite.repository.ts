import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';

export interface CreateInviteData {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
  expiresAt: Date;
}

export interface IInviteRepository {
  findByToken(token: string): Promise<IInviteToken | null>;
  create(data: CreateInviteData): Promise<IInviteToken>;
  markUsed(token: string): Promise<void>;
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
}
