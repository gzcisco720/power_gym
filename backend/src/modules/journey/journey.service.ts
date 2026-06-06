import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  NutritionDailyLog,
  NutritionDailyLogDocument,
} from '../../common/models/nutrition-daily-log.model';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import {
  MemberNutritionPlan,
  MemberNutritionPlanDocument,
} from '../../common/models/member-nutrition-plan.model';
import {
  CheckIn,
  CheckInDocument,
} from '../../common/models/check-in.model';
import { User, UserDocument } from '../../common/models/user.model';

export interface JourneySessionSummary {
  _id: string;
  date: string;
  dayName: string;
  completedSetCount: number;
}

export interface JourneyNutritionDay {
  date: string;
  logged: boolean;
  loggedKcal: number;
  targetKcal: number;
  targetMet: boolean;
}

export interface JourneyBodyTestPoint {
  _id: string;
  date: string;
  weight: number;
  bodyFatPct: number;
}

export interface JourneySummary {
  workoutStreak: number;
  recentSessions: JourneySessionSummary[];
  nutritionDays: JourneyNutritionDay[];
  bodyTests: JourneyBodyTestPoint[];
}

// ─── Timeline types ───────────────────────────────────────────────────────────

interface TimelineItemBase {
  id: string;
  date: string;
}

interface SessionCompletedItem extends TimelineItemBase {
  type: 'session_completed';
  dayName: string;
  completedSetCount: number;
}

interface BodyTestItem extends TimelineItemBase {
  type: 'body_test';
  weight: number;
  bodyFatPct: number;
}

interface CheckInItem extends TimelineItemBase {
  type: 'check_in';
  wellnessAvg: number;
}

interface StreakMilestoneItem extends TimelineItemBase {
  type: 'streak_milestone';
  days: number;
}

interface JoinedItem extends TimelineItemBase {
  type: 'joined';
}

export type JourneyTimelineItem =
  | SessionCompletedItem
  | BodyTestItem
  | CheckInItem
  | StreakMilestoneItem
  | JoinedItem;

export interface JourneyTimelinePage {
  items: JourneyTimelineItem[];
  nextCursor: string | null;
}

export interface GetTimelineOptions {
  cursor?: string;
  limit?: number;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

function toLocalDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateStrOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class JourneyService {
  constructor(
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(NutritionDailyLog.name)
    private readonly nutritionDailyLogModel: Model<NutritionDailyLogDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(MemberNutritionPlan.name)
    private readonly memberNutritionPlanModel: Model<MemberNutritionPlanDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async computeStreak(memberId: string): Promise<number> {
    const sessions = await this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $ne: null },
      })
      .select('completedAt')
      .lean();

    const dateSet = new Set<string>();
    for (const s of sessions) {
      if (s.completedAt) {
        dateSet.add(toLocalDateStr(s.completedAt));
      }
    }

    const todayStr = getDateStrOffset(0);
    const yesterdayStr = getDateStrOffset(-1);

    // Determine start point
    let streak = 0;
    let startStr: string;
    if (dateSet.has(todayStr)) {
      startStr = todayStr;
    } else if (dateSet.has(yesterdayStr)) {
      startStr = yesterdayStr;
    } else {
      return 0;
    }

    // Walk backwards from startStr
    const startDate = new Date(startStr + 'T00:00:00Z');
    let cursor = startDate;
    while (true) {
      const curStr = cursor.toISOString().slice(0, 10);
      if (!dateSet.has(curStr)) break;
      streak++;
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }

  async getRecentSessions(memberId: string): Promise<JourneySessionSummary[]> {
    const sessions = await this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $ne: null },
      })
      .sort({ completedAt: -1 })
      .limit(7)
      .lean();

    return sessions.map((s) => ({
      _id: s._id.toString(),
      date: toLocalDateStr(s.completedAt as Date),
      dayName: s.dayName,
      completedSetCount: (s.sets as Array<{ completedAt: Date | null }>).filter(
        (set) => set.completedAt !== null,
      ).length,
    }));
  }

  async getNutritionDays(memberId: string): Promise<JourneyNutritionDay[]> {
    // Build the 7-day window: [today-6 .. today]
    const days: string[] = Array.from({ length: 7 }, (_, i) =>
      getDateStrOffset(i - 6),
    );

    const startDate = days[0];
    const endDate = days[6];

    const logs = await this.nutritionDailyLogModel
      .find({
        memberId: new Types.ObjectId(memberId),
        date: { $gte: startDate, $lte: endDate },
      })
      .lean();

    // Collect unique planIds from logs so we can batch-load plans
    const planIdSet = new Set<string>();
    for (const log of logs) {
      if (log.planId) {
        planIdSet.add(log.planId.toString());
      }
    }

    // Load all referenced plans in one query
    const plans = await this.memberNutritionPlanModel
      .find({
        _id: { $in: Array.from(planIdSet).map((id) => new Types.ObjectId(id)) },
      })
      .lean();

    const planMap = new Map(plans.map((p) => [p._id.toString(), p]));

    const logMap = new Map<string, (typeof logs)[0]>();
    for (const log of logs) {
      logMap.set(log.date, log);
    }

    return days.map((date) => {
      const log = logMap.get(date);
      if (!log) {
        return {
          date,
          logged: false,
          loggedKcal: 0,
          targetKcal: 0,
          targetMet: false,
        };
      }

      const loggedKcal = (
        log.meals as Array<{ items: Array<{ kcal: number }> }>
      ).reduce(
        (sum, meal) =>
          sum + meal.items.reduce((mSum, item) => mSum + item.kcal, 0),
        0,
      );

      // Resolve targetKcal from the referenced nutrition plan day-type
      let targetKcal = 0;
      if (log.planId) {
        const plan = planMap.get(log.planId.toString());
        if (plan) {
          const dayType = (
            plan.dayTypes as Array<{
              name: string;
              meals: Array<{ items: Array<{ kcal: number }> }>;
            }>
          ).find((dt) => dt.name === log.dayTypeName);
          if (dayType) {
            targetKcal = dayType.meals.reduce(
              (sum, meal) =>
                sum + meal.items.reduce((mSum, item) => mSum + item.kcal, 0),
              0,
            );
          }
        }
      }

      const targetMet = targetKcal > 0 && loggedKcal >= targetKcal;

      return {
        date,
        logged: true,
        loggedKcal,
        targetKcal,
        targetMet,
      };
    });
  }

  async getBodyTests(memberId: string): Promise<JourneyBodyTestPoint[]> {
    const tests = await this.bodyTestModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    return tests.map((t) => ({
      _id: t._id.toString(),
      date: toLocalDateStr(t.date),
      weight: t.weight,
      bodyFatPct: t.bodyFatPct,
    }));
  }

  async getSummary(memberId: string): Promise<JourneySummary> {
    const [workoutStreak, recentSessions, nutritionDays, bodyTests] =
      await Promise.all([
        this.computeStreak(memberId),
        this.getRecentSessions(memberId),
        this.getNutritionDays(memberId),
        this.getBodyTests(memberId),
      ]);

    return { workoutStreak, recentSessions, nutritionDays, bodyTests };
  }

  async getTimeline(
    memberId: string,
    options: GetTimelineOptions,
  ): Promise<JourneyTimelinePage> {
    const limit = Math.min(options.limit ?? 20, 50);
    const cursorDate = options.cursor ? new Date(options.cursor) : null;

    const memberOid = new Types.ObjectId(memberId);

    // Build date filter for all queries
    const dateFilter: Record<string, Date> = {};
    if (cursorDate) {
      dateFilter['$lt'] = cursorDate;
    }

    // Fetch all source data concurrently (no per-page filtering at DB level — we
    // load enough to build milestones, then paginate in memory)
    const [sessions, bodyTests, checkIns, user] = await Promise.all([
      this.workoutSessionModel
        .find({
          memberId: memberOid,
          completedAt: { $ne: null, ...dateFilter },
        })
        .sort({ completedAt: -1 })
        .lean(),
      this.bodyTestModel
        .find({ memberId: memberOid, ...(cursorDate ? { date: { $lt: cursorDate } } : {}) })
        .sort({ date: -1 })
        .lean(),
      this.checkInModel
        .find({
          memberId: memberOid,
          ...(cursorDate ? { submittedAt: { $lt: cursorDate } } : {}),
        })
        .sort({ submittedAt: -1 })
        .lean(),
      this.userModel.findById(memberOid).select('createdAt').lean(),
    ]);

    // Build raw items list
    const raw: JourneyTimelineItem[] = [];

    for (const s of sessions) {
      raw.push({
        id: s._id.toString(),
        type: 'session_completed',
        date: (s.completedAt as Date).toISOString(),
        dayName: s.dayName,
        completedSetCount: (
          s.sets as Array<{ completedAt: Date | null }>
        ).filter((set) => set.completedAt !== null).length,
      });
    }

    for (const bt of bodyTests) {
      raw.push({
        id: bt._id.toString(),
        type: 'body_test',
        date: bt.date.toISOString(),
        weight: bt.weight,
        bodyFatPct: bt.bodyFatPct,
      });
    }

    for (const ci of checkIns) {
      const fields = [
        ci.sleepQuality,
        ci.stress,
        ci.fatigue,
        ci.hunger,
        ci.recovery,
        ci.energy,
        ci.digestion,
      ] as number[];
      const wellnessAvg =
        fields.reduce((sum, v) => sum + v, 0) / fields.length;
      raw.push({
        id: ci._id.toString(),
        type: 'check_in',
        date: ci.submittedAt.toISOString(),
        wellnessAvg: Math.round(wellnessAvg * 10) / 10,
      });
    }

    // Compute streak milestones from ALL sessions (need unconstrained set for
    // milestone detection). When paginating we only need milestones whose dates
    // are before the cursor, but we already filtered sessions by cursor so the
    // sessions array is the right set.
    const completedDates = sessions
      .filter((s) => s.completedAt)
      .map((s) => (s.completedAt as Date).toISOString().slice(0, 10))
      .sort(); // ascending

    const milestoneItems = this.computeStreakMilestones(completedDates);
    raw.push(...milestoneItems);

    // Add joined item (member's createdAt) only on the final page or when there
    // is no cursor (i.e. first/only page and we're not mid-pagination past it)
    if (user) {
      const joinedDate = (user as unknown as { createdAt: Date }).createdAt;
      if (!cursorDate || joinedDate < cursorDate) {
        raw.push({
          id: `joined-${memberId}`,
          type: 'joined',
          date: joinedDate.toISOString(),
        });
      }
    }

    // Sort all items newest-first
    raw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Paginate
    const page = raw.slice(0, limit);
    const hasMore = raw.length > limit;
    const nextCursor = hasMore ? page[page.length - 1].date : null;

    return { items: page, nextCursor };
  }

  private computeStreakMilestones(sortedDates: string[]): StreakMilestoneItem[] {
    if (sortedDates.length === 0) return [];

    // Build date set
    const dateSet = new Set(sortedDates);
    const uniqueDates = [...dateSet].sort(); // ascending

    // Walk through each date and compute the streak length ending on that date
    const milestones: StreakMilestoneItem[] = [];
    const emittedMilestones = new Set<string>(); // "date-days" to avoid dupes

    for (let i = 0; i < uniqueDates.length; i++) {
      // Compute streak ending at uniqueDates[i]
      let streak = 0;
      let cursor = new Date(uniqueDates[i] + 'T00:00:00Z');
      while (dateSet.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor = new Date(cursor);
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }

      for (const threshold of STREAK_MILESTONES) {
        if (streak >= threshold) {
          // The milestone occurred on the day the streak first crossed this threshold.
          // That is the date at index (i - threshold + 1) from the current date walk-back.
          // Simpler: emit milestone keyed by the crossing date, deduplicate.
          const milestoneDate = new Date(uniqueDates[i] + 'T00:00:00Z');
          milestoneDate.setUTCDate(milestoneDate.getUTCDate() - (streak - threshold));
          const key = `${milestoneDate.toISOString().slice(0, 10)}-${threshold}`;
          if (!emittedMilestones.has(key)) {
            emittedMilestones.add(key);
            milestones.push({
              id: `streak-${threshold}-${milestoneDate.toISOString().slice(0, 10)}`,
              type: 'streak_milestone',
              date: milestoneDate.toISOString(),
              days: threshold,
            });
          }
        }
      }
    }

    return milestones;
  }
}
