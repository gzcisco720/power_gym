import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InviteRepository } from '../repositories/invite.repository';
import { EmailService } from '../email/email.service';
import { INVITE_TTL_MS } from '../common/constants';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsIn(['trainer', 'member'])
  role!: 'trainer' | 'member';

  @IsOptional()
  @IsString()
  trainerId?: string;
}

export interface InviteListItem {
  _id: string;
  token: string;
  role: 'trainer' | 'member';
  recipientEmail: string;
  expiresAt: Date;
  usedAt: Date | null;
  trainerId: string | null;
}

export interface CreateInviteResult {
  inviteUrl: string;
}

interface InviterInfo {
  userId: string;
  name: string;
}

@Injectable()
export class OwnerInvitesService {
  constructor(
    private readonly inviteRepo: InviteRepository,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  private buildInviteUrl(token: string): string {
    const appUrl =
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return `${appUrl}/register?token=${token}`;
  }

  async create(
    dto: CreateInviteDto,
    inviter: InviterInfo,
  ): Promise<CreateInviteResult> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await this.inviteRepo.create({
      token,
      role: dto.role,
      invitedBy: inviter.userId,
      recipientEmail: dto.email,
      expiresAt,
      trainerId: dto.trainerId ?? null,
    });

    const inviteUrl = this.buildInviteUrl(token);

    try {
      await this.emailService.sendInvite({
        to: dto.email,
        inviterName: inviter.name,
        role: dto.role,
        inviteUrl,
      });
    } catch (e) {
      console.error('Failed to send invite email:', e);
    }

    return { inviteUrl };
  }

  async list(): Promise<InviteListItem[]> {
    const invites = await this.inviteRepo.findAll();
    return invites.map((inv) => ({
      _id: inv._id.toString(),
      token: inv.token,
      role: inv.role,
      recipientEmail: inv.recipientEmail,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      trainerId: inv.trainerId?.toString() ?? null,
    }));
  }

  async revoke(id: string): Promise<void> {
    const invite = await this.inviteRepo.findById(id);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    await this.inviteRepo.revoke(id);
  }

  async resend(id: string, inviterName: string): Promise<CreateInviteResult> {
    const updated = await this.inviteRepo.regenerate(id);
    const inviteUrl = this.buildInviteUrl(updated.token);

    await this.emailService.sendInvite({
      to: updated.recipientEmail,
      inviterName,
      role: updated.role,
      inviteUrl,
    });

    return { inviteUrl };
  }
}
