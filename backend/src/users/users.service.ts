import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import type { IUser } from '../database/models/user.model';
import type { IInviteToken } from '../database/models/invite-token.model';
import type { IUserProfile } from '../database/models/user-profile.model';
import type { UpdateProfileData } from '../repositories/user-profile.repository';
import type { UserRole } from '../common/interfaces/auth-user.interface';
import { CreateInviteDto } from './dto/create-invite.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly inviteRepo: InviteRepository,
    private readonly profileRepo: UserProfileRepository,
  ) {}

  // ── Members ──────────────────────────────────────────────

  async listMembers(callerRole: UserRole, callerId: string): Promise<IUser[]> {
    if (callerRole === 'owner') {
      return this.userRepo.findAllMembers();
    }
    // trainer: only their own members
    return this.userRepo.findAllMembers(callerId);
  }

  async getMember(
    callerRole: UserRole,
    callerId: string,
    memberId: string,
  ): Promise<IUser> {
    const member = await this.userRepo.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (callerRole === 'trainer') {
      if (member.trainerId?.toString() !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }

    return member;
  }

  // ── Owner: members ───────────────────────────────────────

  async listAllMembers(trainerId?: string): Promise<IUser[]> {
    return this.userRepo.findAllMembers(trainerId);
  }

  async assignTrainer(
    memberId: string,
    trainerId: string | null,
  ): Promise<void> {
    const member = await this.userRepo.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }
    await this.userRepo.updateTrainerId(memberId, trainerId);
  }

  // ── Owner: trainers ──────────────────────────────────────

  async listTrainers(): Promise<IUser[]> {
    return this.userRepo.findByRole('trainer');
  }

  // ── Invites ──────────────────────────────────────────────

  async createInvite(
    callerRole: UserRole,
    callerId: string,
    dto: CreateInviteDto,
  ): Promise<IInviteToken> {
    if (callerRole === 'member') {
      throw new ForbiddenException('Members cannot send invites');
    }
    if (dto.role === 'trainer' && callerRole !== 'owner') {
      throw new ForbiddenException('Only owners can invite trainers');
    }

    const trainerId =
      dto.role === 'member'
        ? (dto.trainerId ?? (callerRole === 'trainer' ? callerId : undefined))
        : undefined;

    return this.inviteRepo.create({
      token: randomUUID(),
      role: dto.role,
      invitedBy: callerId,
      recipientEmail: dto.recipientEmail,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      trainerId: trainerId ?? null,
    });
  }

  async listOwnerInvites(): Promise<IInviteToken[]> {
    return this.inviteRepo.findAll();
  }

  async listTrainerInvites(trainerId: string): Promise<IInviteToken[]> {
    return this.inviteRepo.findByInvitedBy(trainerId);
  }

  async resendInvite(
    id: string,
    callerRole: UserRole,
    callerId: string,
  ): Promise<IInviteToken> {
    if (callerRole === 'trainer') {
      const existing = await this.inviteRepo.findById(id);
      if (!existing || existing.invitedBy.toString() !== callerId) {
        throw new ForbiddenException('Forbidden');
      }
    }
    return this.inviteRepo.regenerate(id);
  }

  async revokeInvite(id: string): Promise<{ success: boolean }> {
    await this.inviteRepo.revoke(id);
    return { success: true };
  }

  async assertInviteOwner(id: string, callerId: string): Promise<void> {
    const invite = await this.inviteRepo.findById(id);
    if (!invite || invite.invitedBy.toString() !== callerId) {
      throw new ForbiddenException('Forbidden');
    }
  }

  // ── Owner: stats ─────────────────────────────────────────

  async getOwnerStats(): Promise<{
    trainerCount: number;
    memberCount: number;
    pendingInviteCount: number;
    membersByMonth: { label: string; newCount: number }[];
  }> {
    const now = new Date();
    const [trainers, members, pendingInviteCount, membersByMonth] =
      await Promise.all([
        this.userRepo.findByRole('trainer'),
        this.userRepo.findAllMembers(),
        this.inviteRepo.countPending(now),
        this.userRepo.findMembersJoinedByMonth(6),
      ]);

    return {
      trainerCount: trainers.length,
      memberCount: members.length,
      pendingInviteCount,
      membersByMonth,
    };
  }

  // ── Profiles ─────────────────────────────────────────────

  async getMemberProfile(
    callerRole: UserRole,
    callerId: string,
    memberId: string,
  ): Promise<IUserProfile | null> {
    if (callerRole === 'member' && callerId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    if (callerRole === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }
    return this.profileRepo.findByUserId(memberId);
  }

  async upsertMemberProfile(
    callerRole: UserRole,
    callerId: string,
    memberId: string,
    data: UpdateProfileData,
  ): Promise<IUserProfile> {
    if (callerRole === 'member' && callerId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    if (callerRole === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }
    return this.profileRepo.upsert(memberId, data);
  }
}
