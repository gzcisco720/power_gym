import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
import {
  Equipment,
  EquipmentDocument,
} from '../../common/models/equipment.model';
import {
  InviteToken,
  InviteTokenDocument,
} from '../../common/models/invite-token.model';
import {
  OwnerDashboardResponse,
  MemberGrowthEntry,
  TrainerPerformanceEntry,
} from './dto/dashboard-response.types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Injectable()
export class OwnerDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly sessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(Equipment.name)
    private readonly equipmentModel: Model<EquipmentDocument>,
    @InjectModel(InviteToken.name)
    private readonly inviteModel: Model<InviteTokenDocument>,
  ) {}

  async getOwnerDashboard(): Promise<OwnerDashboardResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);

    const [trainers, members] = await Promise.all([
      this.userModel.find({ role: 'trainer' }).lean(),
      this.userModel.find({ role: 'member' }).lean(),
    ]);

    const memberIds = members.map((m) => m._id);

    const [
      sessionsThisMonth,
      sessionsLastMonth,
      activeToday,
      checkinsThisWeek,
      checkinsLastWeek,
      allEquipment,
      allInvites,
    ] = await Promise.all([
      this.sessionModel.countDocuments({
        memberId: { $in: memberIds },
        completedAt: { $gte: startOfMonth },
      }),
      this.sessionModel.countDocuments({
        memberId: { $in: memberIds },
        completedAt: { $gte: startOfLastMonth, $lt: startOfMonth },
      }),
      this.sessionModel.countDocuments({
        memberId: { $in: memberIds },
        completedAt: { $gte: startOfDay },
      }),
      this.checkInModel.countDocuments({ submittedAt: { $gte: sevenDaysAgo } }),
      this.checkInModel.countDocuments({
        submittedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
      }),
      this.equipmentModel.find({}).lean(),
      this.inviteModel.find({}).lean(),
    ]);

    // Member growth: last 6 months (oldest first)
    const memberGrowth = await this.getMemberGrowth(6);

    // Trainer performance (top 5 by session count this month)
    const trainerPerformance = await this.getTrainerPerformance(
      trainers,
      members,
      startOfMonth,
    );

    // Equipment stats
    const activeCount = allEquipment.filter(
      (e) => e.status === 'active',
    ).length;
    const maintenanceCount = allEquipment.filter(
      (e) => e.status === 'maintenance',
    ).length;
    const retiredCount = allEquipment.filter(
      (e) => e.status === 'retired',
    ).length;
    const overdueCount = allEquipment.filter(
      (e) => e.nextServiceDate && e.nextServiceDate < now,
    ).length;

    const nonActiveItems = allEquipment
      .filter((e) => e.status !== 'active')
      .slice(0, 5)
      .map((e) => ({
        name: e.name,
        status: e.status as 'maintenance' | 'retired' | 'overdue',
        notes: e.note ?? null,
      }));

    // Invite stats
    const pendingInvites = allInvites.filter(
      (i) => i.usedAt === null && i.expiresAt > now,
    );
    const expiringInvites = pendingInvites.filter(
      (i) => i.expiresAt < threeDaysFromNow,
    );

    const membersJoinedThisMonth =
      memberGrowth.length > 0 ? memberGrowth[memberGrowth.length - 1].count : 0;

    const checkinRateThisWeek =
      members.length > 0
        ? Math.min(Math.round((checkinsThisWeek / members.length) * 100), 100)
        : 0;

    const checkinRateLastWeek =
      members.length > 0
        ? Math.min(Math.round((checkinsLastWeek / members.length) * 100), 100)
        : 0;

    return {
      stats: {
        trainerCount: trainers.length,
        memberCount: members.length,
        membersJoinedThisMonth,
        sessionsThisMonth,
        sessionsLastMonth,
        activeToday,
        checkinRateThisWeek,
        checkinRateLastWeek,
        pendingInviteCount: pendingInvites.length,
        expiringInviteCount: expiringInvites.length,
      },
      memberGrowth,
      trainerPerformance,
      equipment: {
        activeCount,
        maintenanceCount,
        retiredCount,
        overdueCount,
        nonActiveItems,
      },
    };
  }

  private async getMemberGrowth(months: number): Promise<MemberGrowthEntry[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.userModel.aggregate<{
      _id: { year: number; month: number };
      count: number;
    }>([
      { $match: { role: 'member', createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const rowMap = new Map(
      rows.map((r) => [`${r._id.year}-${r._id.month}`, r.count]),
    );

    const result: MemberGrowthEntry[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      result.push({
        month: MONTHS[month - 1],
        count: rowMap.get(`${year}-${month}`) ?? 0,
      });
    }
    return result;
  }

  private async getTrainerPerformance(
    trainers: Array<{
      _id: Types.ObjectId;
      firstName: string;
      lastName: string;
    }>,
    members: Array<{ _id: Types.ObjectId; trainerId: Types.ObjectId | null }>,
    startOfMonth: Date,
  ): Promise<TrainerPerformanceEntry[]> {
    const results = await Promise.all(
      trainers.map(async (trainer) => {
        const trainerMembers = members.filter(
          (m) => m.trainerId?.toString() === trainer._id.toString(),
        );
        const trainerMemberIds = trainerMembers.map((m) => m._id);
        const sessionCount =
          trainerMemberIds.length > 0
            ? await this.sessionModel.countDocuments({
                memberId: { $in: trainerMemberIds },
                completedAt: { $gte: startOfMonth },
              })
            : 0;

        return {
          trainerId: trainer._id.toString(),
          name: `${trainer.firstName} ${trainer.lastName}`,
          sessionCount,
          memberCount: trainerMembers.length,
        };
      }),
    );

    return results.sort((a, b) => b.sessionCount - a.sessionCount).slice(0, 5);
  }
}
