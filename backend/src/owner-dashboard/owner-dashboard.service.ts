import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { CheckInRepository } from '../repositories/check-in.repository';
import type { EquipmentStatus } from '../database/models/equipment.model';

export interface TrainerBreakdownRow {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  memberCount: number;
  sessionsThisMonth: number;
}

export interface EquipmentStatusResult {
  active: number;
  maintenance: number;
  retired: number;
  overdue: number;
  items: EquipmentItem[];
}

export interface EquipmentItem {
  _id: string;
  name: string;
  status: EquipmentStatus;
  note: string | null;
  nextServiceDate: Date | null;
}

@Injectable()
export class OwnerDashboardService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly inviteRepo: InviteRepository,
    private readonly sessionRepo: WorkoutSessionRepository,
    private readonly equipmentRepo: EquipmentRepository,
    private readonly checkInRepo: CheckInRepository,
  ) {}

  async getStats(): Promise<{
    trainerCount: number;
    memberCount: number;
    pendingInviteCount: number;
    expiringSoonCount: number;
    sessionsThisMonth: number;
    sessionsLastMonth: number;
    sessionsToday: number;
    membersThisMonth: number;
    checkInsThisWeek: number;
    checkInsLastWeek: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - 14);

    const [trainers, members, invites, checkInsThisWeek, checkInsLastWeek] =
      await Promise.all([
        this.userRepo.findByRole('trainer'),
        this.userRepo.findAllMembers(),
        this.inviteRepo.findAll(),
        this.checkInRepo.countSince(startOfWeek),
        this.checkInRepo.countSince(startOfLastWeek),
      ]);

    const memberIds = members.map((m) => m._id.toString());
    const [sessionsThisMonth, sessionsLastMonth, sessionsToday, membersJoined] =
      await Promise.all([
        this.sessionRepo.countByMemberIdsSince(memberIds, startOfMonth),
        this.sessionRepo.countByMemberIdsSince(memberIds, startOfLastMonth),
        this.sessionRepo.countByMemberIdsSince(memberIds, startOfDay),
        this.userRepo.findMembersJoinedByMonth(1),
      ]);

    const pendingInvites = invites.filter(
      (i) => i.usedAt === null && i.expiresAt > now,
    );
    const expiringSoonCount = pendingInvites.filter(
      (i) => i.expiresAt < new Date(now.getTime() + 3 * 86400000),
    ).length;

    return {
      trainerCount: trainers.length,
      memberCount: members.length,
      pendingInviteCount: pendingInvites.length,
      expiringSoonCount,
      sessionsThisMonth,
      sessionsLastMonth,
      sessionsToday,
      membersThisMonth: membersJoined[0]?.newCount ?? 0,
      checkInsThisWeek,
      checkInsLastWeek,
    };
  }

  async getTrainerBreakdown(): Promise<TrainerBreakdownRow[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const trainers = await this.userRepo.findByRole('trainer');

    return Promise.all(
      trainers.map(async (trainer) => {
        const members = await this.userRepo.findAllMembers(
          trainer._id.toString(),
        );
        const memberIds = members.map((m) => m._id.toString());
        const sessionsThisMonth = await this.sessionRepo.countByMemberIdsSince(
          memberIds,
          startOfMonth,
        );
        return {
          _id: trainer._id.toString(),
          name: trainer.name,
          email: trainer.email,
          createdAt: trainer.createdAt,
          memberCount: members.length,
          sessionsThisMonth,
        };
      }),
    );
  }

  async getEquipmentStatus(): Promise<EquipmentStatusResult> {
    const items = await this.equipmentRepo.findAll();
    const now = new Date();

    const active = items.filter((e) => e.status === 'active').length;
    const maintenance = items.filter((e) => e.status === 'maintenance').length;
    const retired = items.filter((e) => e.status === 'retired').length;
    const overdue = items.filter(
      (e) => e.nextServiceDate !== null && e.nextServiceDate < now,
    ).length;

    const STATUS_ORDER: Record<EquipmentStatus, number> = {
      retired: 0,
      maintenance: 1,
      active: 2,
    };

    const nonActiveItems = items
      .filter((e) => e.status !== 'active')
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
      .slice(0, 5)
      .map((e) => ({
        _id: e._id.toString(),
        name: e.name,
        status: e.status,
        note: e.note,
        nextServiceDate: e.nextServiceDate,
      }));

    return { active, maintenance, retired, overdue, items: nonActiveItems };
  }
}
