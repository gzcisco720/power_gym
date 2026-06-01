import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
import {
  PersonalBest,
  PersonalBestDocument,
} from '../../common/models/personal-best.model';
import {
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';
import {
  MemberNutritionPlan,
  MemberNutritionPlanDocument,
} from '../../common/models/member-nutrition-plan.model';
import {
  TrainerDashboardResponse,
  TodaySession,
  NeedsAttentionItem,
  PendingCheckin,
  ComplianceEntry,
  RecentPR,
  MyTraining,
  ThisWeekEntry,
} from './dto/dashboard-response.types';

const DAY_LABELS: ThisWeekEntry['day'][] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

@Injectable()
export class TrainerDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly sessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(ScheduledSession.name)
    private readonly scheduledSessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(PersonalBest.name)
    private readonly personalBestModel: Model<PersonalBestDocument>,
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(MemberNutritionPlan.name)
    private readonly memberNutritionPlanModel: Model<MemberNutritionPlanDocument>,
  ) {}

  async getTrainerDashboard(
    trainerId: string,
  ): Promise<TrainerDashboardResponse> {
    const trainerObjId = new Types.ObjectId(trainerId);
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // Members belonging to this trainer
    const members = await this.userModel
      .find({ trainerId: trainerObjId })
      .lean();
    const memberIds = members.map((m) => m._id);
    const memberCount = members.length;

    // Build member lookup maps
    const memberMap = new Map(
      members.map((m) => [
        m._id.toString(),
        `${m.firstName} ${m.lastName}`,
      ]),
    );

    // Today's scheduled sessions for this trainer
    const scheduledToday = await this.scheduledSessionModel
      .find({
        trainerId: trainerObjId,
        date: { $gte: todayStart, $lte: todayEnd },
        status: 'scheduled',
      })
      .lean();

    const sessionsTodayCount = scheduledToday.length;

    // Completed workout sessions today for members of this trainer
    const completedTodayIds = new Set<string>();
    if (memberIds.length > 0) {
      const completedToday = await this.sessionModel
        .find({
          memberId: { $in: memberIds },
          completedAt: { $gte: todayStart, $lte: todayEnd },
        })
        .lean();
      completedToday.forEach((s) =>
        completedTodayIds.add(s.memberId.toString()),
      );
    }

    // Build todaysSessions response
    const todaysSessions: TodaySession[] = scheduledToday.map((s) => {
      const memberId =
        s.memberIds.length > 0 ? s.memberIds[0].toString() : null;
      const memberName = memberId ? (memberMap.get(memberId) ?? 'Member') : 'Member';

      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const sessionStart = new Date(now);
      sessionStart.setHours(startH, startM, 0, 0);
      const sessionEnd = new Date(now);
      sessionEnd.setHours(endH, endM, 0, 0);

      let status: 'completed' | 'active' | 'upcoming';
      if (memberId && completedTodayIds.has(memberId)) {
        status = 'completed';
      } else if (now >= sessionStart && now <= sessionEnd) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      return {
        memberId: memberId ?? '',
        memberName,
        planName: null,
        startTime: s.date.toISOString(),
        endTime: s.date.toISOString(),
        status,
      };
    });

    // Check-ins last 7 days (for this trainer's members)
    const checkinsLast7Days =
      memberIds.length > 0
        ? await this.checkInModel.countDocuments({
            trainerId: trainerObjId,
            submittedAt: { $gte: sevenDaysAgo },
          })
        : 0;

    // Needs attention: idle members (no completed session in last 7 days)
    const needsAttention: NeedsAttentionItem[] = [];

    if (memberIds.length > 0) {
      // Get active plans and nutrition plans for all members in bulk
      const [activePlans, activeNutritionPlans] = await Promise.all([
        this.memberPlanModel.find({ memberId: { $in: memberIds }, isActive: true }).lean(),
        this.memberNutritionPlanModel.find({ memberId: { $in: memberIds }, isActive: true }).lean(),
      ]);

      const planMemberIds = new Set(activePlans.map((p) => p.memberId.toString()));
      const nutritionMemberIds = new Set(activeNutritionPlans.map((p) => p.memberId.toString()));

      await Promise.all(
        members.map(async (member) => {
          const mId = member._id.toString();
          const mName = `${member.firstName} ${member.lastName}`;
          const mObjId = member._id;

          const [recentCount] = await Promise.all([
            this.sessionModel.countDocuments({
              memberId: mObjId,
              completedAt: { $gte: sevenDaysAgo },
            }),
          ]);

          if (!planMemberIds.has(mId)) {
            needsAttention.push({
              memberId: mId,
              memberName: mName,
              alertType: 'no_plan',
              detail: 'No training plan',
            });
          }

          if (!nutritionMemberIds.has(mId)) {
            needsAttention.push({
              memberId: mId,
              memberName: mName,
              alertType: 'no_nutrition',
              detail: 'No nutrition plan',
            });
          }

          if (recentCount === 0) {
            needsAttention.push({
              memberId: mId,
              memberName: mName,
              alertType: 'idle',
              detail: '7+ days no session',
            });
          }
        }),
      );
    }

    const needsAttentionCount = new Set(
      needsAttention.filter((a) => a.alertType === 'idle').map((a) => a.memberId),
    ).size;

    // Pending check-ins (recent, for this trainer)
    const recentCheckIns = await this.checkInModel
      .find({ trainerId: trainerObjId, submittedAt: { $gte: sevenDaysAgo } })
      .sort({ submittedAt: -1 })
      .limit(3)
      .lean();

    const pendingCheckins: PendingCheckin[] = recentCheckIns.map((ci) => ({
      memberId: ci.memberId.toString(),
      memberName: memberMap.get(ci.memberId.toString()) ?? 'Member',
      checkinId: ci._id.toString(),
      createdAt: ci.submittedAt.toISOString(),
    }));

    // Compliance: completed sessions / 12 over 30 days per member (capped at 5 shown)
    const compliance: ComplianceEntry[] = [];
    if (memberIds.length > 0) {
      const rows = await Promise.all(
        members.map(async (m) => {
          const count = await this.sessionModel.countDocuments({
            memberId: m._id,
            completedAt: { $gte: thirtyDaysAgo },
          });
          const percentage = Math.min(Math.round((count / 12) * 100), 100);
          return {
            memberId: m._id.toString(),
            memberName: `${m.firstName} ${m.lastName}`,
            percentage,
          };
        }),
      );
      rows.sort((a, b) => b.percentage - a.percentage);
      compliance.push(...rows.slice(0, 5));
    }

    // Recent PRs (last 7 days) for members of this trainer
    const recentPRs: RecentPR[] = [];
    if (memberIds.length > 0) {
      const prs = await this.personalBestModel
        .find({
          memberId: { $in: memberIds },
          achievedAt: { $gte: sevenDaysAgo },
        })
        .lean();

      prs.slice(0, 5).forEach((pr) => {
        recentPRs.push({
          memberId: pr.memberId.toString(),
          memberName: memberMap.get(pr.memberId.toString()) ?? 'Member',
          exercise: pr.exerciseName,
          estimatedOneRM: pr.estimatedOneRM,
        });
      });
    }

    // My Training (trainer's own training data — using trainer's WorkoutSession records)
    const myTraining = await this.getMyTraining(trainerObjId, now);

    // This week schedule
    const thisWeek = await this.getThisWeek(trainerObjId, now);

    return {
      stats: {
        memberCount,
        sessionsTodayCount,
        checkinsLast7Days,
        needsAttentionCount,
      },
      todaysSessions,
      needsAttention: needsAttention.slice(0, 5),
      pendingCheckins,
      compliance,
      recentPRs,
      myTraining,
      thisWeek,
    };
  }

  private async getMyTraining(
    trainerObjId: Types.ObjectId,
    now: Date,
  ): Promise<MyTraining> {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    // The trainer logs sessions with loggedBy = their own id, or memberId = their own id
    // Since trainers train themselves, we look for sessions where memberId = trainerId
    const [sessions90d, sessionsThisMonth] = await Promise.all([
      this.sessionModel
        .find({
          memberId: trainerObjId,
          completedAt: { $gte: ninetyDaysAgo },
        })
        .lean(),
      this.sessionModel.countDocuments({
        memberId: trainerObjId,
        completedAt: { $gte: startOfMonth },
      }),
    ]);

    const key = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const daySet = new Set(
      sessions90d.flatMap((s) =>
        s.completedAt ? [key(new Date(s.completedAt))] : [],
      ),
    );

    // Streak calculation
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (daySet.has(key(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Last session
    const lastSession = sessions90d
      .filter((s) => s.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime(),
      )[0];

    const lastSessionType = lastSession?.dayName ?? null;
    const lastSessionDate = lastSession?.completedAt
      ? new Date(lastSession.completedAt).toISOString()
      : null;

    // 14-day heatmap
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      return daySet.has(key(d));
    });

    return {
      streakDays: streak,
      lastSessionType,
      lastSessionDate,
      last14Days,
      sessionsThisMonth,
    };
  }

  private async getThisWeek(
    trainerObjId: Types.ObjectId,
    now: Date,
  ): Promise<ThisWeekEntry[]> {
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const sessions = await this.scheduledSessionModel
      .find({
        trainerId: trainerObjId,
        date: { $gte: weekStart, $lte: weekEnd },
        status: 'scheduled',
      })
      .lean();

    const counts = new Array<number>(7).fill(0);
    for (const s of sessions) {
      const d = new Date(s.date);
      const dow = d.getDay();
      const idx = dow === 0 ? 6 : dow - 1;
      counts[idx]++;
    }

    const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return DAY_LABELS.map((day, i) => ({
      day,
      count: counts[i],
      isToday: i === todayIdx,
    }));
  }
}
