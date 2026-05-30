import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InviteRepository } from '../repositories/invite.repository';
import { EmailService } from '../email/email.service';
import { INVITE_TTL_MS } from '../common/constants';
import { IsEmail } from 'class-validator';

export class CreateTrainerInviteDto {
  @IsEmail()
  email!: string;
}

export interface TrainerInviteListItem {
  _id: string;
  token: string;
  role: 'trainer' | 'member';
  recipientEmail: string;
  expiresAt: Date;
  usedAt: Date | null;
  trainerId: string | null;
  invitedBy: string;
}

export interface CreateInviteResult {
  inviteUrl: string;
}

interface InviterInfo {
  userId: string;
  name: string;
}

@Injectable()
export class TrainerInvitesService {
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
    dto: CreateTrainerInviteDto,
    inviter: InviterInfo,
  ): Promise<CreateInviteResult> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await this.inviteRepo.create({
      token,
      role: 'member',
      invitedBy: inviter.userId,
      recipientEmail: dto.email,
      expiresAt,
      trainerId: inviter.userId,
    });

    const inviteUrl = this.buildInviteUrl(token);

    try {
      await this.emailService.sendInvite({
        to: dto.email,
        inviterName: inviter.name,
        role: 'member',
        inviteUrl,
      });
    } catch (e) {
      console.error('Failed to send invite email:', e);
    }

    return { inviteUrl };
  }

  async list(trainerId: string): Promise<TrainerInviteListItem[]> {
    const invites = await this.inviteRepo.findByInvitedBy(trainerId);
    return invites.map((inv) => ({
      _id: inv._id.toString(),
      token: inv.token,
      role: inv.role,
      recipientEmail: inv.recipientEmail,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      trainerId: inv.trainerId?.toString() ?? null,
      invitedBy: inv.invitedBy.toString(),
    }));
  }

  async revoke(id: string, trainerId: string): Promise<void> {
    const invite = await this.inviteRepo.findById(id);
    if (!invite || invite.invitedBy.toString() !== trainerId) {
      throw new NotFoundException('Invite not found');
    }
    await this.inviteRepo.revoke(id);
  }

  async resend(
    id: string,
    trainerId: string,
    inviterName: string,
  ): Promise<CreateInviteResult> {
    const invite = await this.inviteRepo.findById(id);
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.invitedBy.toString() !== trainerId) {
      throw new ForbiddenException('Invite not owned by this trainer');
    }

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
