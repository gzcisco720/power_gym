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
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
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

export type MilestoneTagColor = 'gold' | 'green' | 'indigo';

export interface MilestoneTag {
  label: string;
  color: MilestoneTagColor;
}

export interface MilestoneInfo {
  emoji: string;
  title: string;
  tags: MilestoneTag[];
  photos: string[]; // up to 3 check-in photo URLs near the test date
}

interface SessionCompletedItem extends TimelineItemBase {
  type: 'session_completed';
  dayName: string;
  completedSetCount: number;
}

interface BodyTestItem extends TimelineItemBase {
  type: 'body_test';
  testNumber: number;
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;
  deltaWeight: number | null;
  milestone: MilestoneInfo | null;
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

// ─── Milestone detection (ported from web milestone-calculator.ts) ────────────

interface BodyTestSnapshot {
  date: Date;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  targetBodyFatPct: number | null;
  targetWeight: number | null;
}

interface MilestoneTrigger {
  type: 'goal_reached' | 'significant_change' | 'personal_best' | 'time_milestone' | 'checkin_streak';
  label: string;
  color: MilestoneTagColor;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
const FOURTEEN_DAYS_MS = 14 * MS_PER_DAY;
const TIME_ANNIVERSARIES_MONTHS = [3, 6, 12];
const STREAK_THRESHOLDS = [30, 60, 100];
const STREAK_MILESTONES_DAYS = [7, 14, 30, 60, 100];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function evaluateMilestone(
  index: number,
  tests: BodyTestSnapshot[],
  checkInDates: Date[],
): MilestoneTrigger[] {
  const triggers: MilestoneTrigger[] = [];
  const test = tests[index];
  const prev = index > 0 ? tests[index - 1] : null;
  const earlier = tests.slice(0, index);

  // Time milestone
  if (index === 0) {
    triggers.push({ type: 'time_milestone', label: 'Journey begins', color: 'indigo' });
  } else {
    const firstDate = tests[0].date;
    for (const months of TIME_ANNIVERSARIES_MONTHS) {
      const anniversary = addMonths(firstDate, months);
      if (Math.abs(test.date.getTime() - anniversary.getTime()) <= SEVEN_DAYS_MS) {
        triggers.push({ type: 'time_milestone', label: `${months === 12 ? '1-year' : `${months}-month`} milestone`, color: 'indigo' });
        break;
      }
    }
  }

  // Goal reached
  if (test.targetBodyFatPct !== null && test.bodyFatPct <= test.targetBodyFatPct) {
    const alreadyReached = earlier.some(
      (t) => t.targetBodyFatPct !== null && t.bodyFatPct <= t.targetBodyFatPct,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 Body fat goal reached', color: 'gold' });
    }
  }
  if (test.targetWeight !== null && test.weight <= test.targetWeight) {
    const alreadyReached = earlier.some(
      (t) => t.targetWeight !== null && t.weight <= t.targetWeight,
    );
    if (!alreadyReached) {
      triggers.push({ type: 'goal_reached', label: '🎯 Weight goal reached', color: 'gold' });
    }
  }

  // Significant change
  if (prev) {
    if (prev.bodyFatPct - test.bodyFatPct >= 1.0) {
      triggers.push({ type: 'significant_change', label: `⬇ Body fat −${(prev.bodyFatPct - test.bodyFatPct).toFixed(1)}%`, color: 'green' });
    }
    if (Math.abs(test.weight - prev.weight) >= 2.0) {
      triggers.push({ type: 'significant_change', label: `Weight change ${Math.abs(test.weight - prev.weight).toFixed(1)} kg`, color: 'green' });
    }
  }

  // Personal best
  const lowestBf = earlier.length > 0 ? Math.min(...earlier.map((t) => t.bodyFatPct)) : Infinity;
  if (test.bodyFatPct < lowestBf) {
    triggers.push({ type: 'personal_best', label: '🥇 All-time low body fat', color: 'indigo' });
  }
  const highestLean = earlier.length > 0 ? Math.max(...earlier.map((t) => t.leanMassKg)) : -Infinity;
  if (test.leanMassKg > highestLean) {
    triggers.push({ type: 'personal_best', label: '🏅 All-time high lean mass', color: 'indigo' });
  }

  // Check-in streak
  const streakDates = STREAK_THRESHOLDS.flatMap((n) =>
    checkInDates.length >= n ? [{ count: n, date: checkInDates[n - 1] }] : [],
  );
  const nearbyStreaks = streakDates.filter(
    ({ date }) => Math.abs(date.getTime() - test.date.getTime()) <= SEVEN_DAYS_MS,
  );
  if (nearbyStreaks.length > 0) {
    const best = nearbyStreaks.reduce((b, s) => (s.count > b.count ? s : b));
    triggers.push({ type: 'checkin_streak', label: `✅ ${best.count} check-in streak`, color: 'green' });
  }

  return triggers;
}

const EMOJI_PRIORITY: MilestoneTrigger['type'][] = [
  'goal_reached', 'time_milestone', 'personal_best', 'significant_change', 'checkin_streak',
];

function selectEmoji(triggers: MilestoneTrigger[]): string {
  const map: Record<MilestoneTrigger['type'], string> = {
    goal_reached: '🏆',
    time_milestone: '🌟',
    personal_best: '🥇',
    significant_change: '⬇️',
    checkin_streak: '✅',
  };
  const top = EMOJI_PRIORITY.find((p) => triggers.some((t) => t.type === p));
  return top ? map[top] : '⭐';
}

function buildMilestoneTitle(triggers: MilestoneTrigger[]): string {
  const top = EMOJI_PRIORITY.find((p) => triggers.some((t) => t.type === p));
  switch (top) {
    case 'goal_reached': return 'Goal achieved';
    case 'time_milestone': return triggers.find((t) => t.type === 'time_milestone')!.label;
    case 'personal_best': return 'New personal record';
    case 'significant_change': return 'Significant progress';
    case 'checkin_streak': return triggers.find((t) => t.type === 'checkin_streak')!.label;
    default: return 'Milestone';
  }
}

// Find up to `max` check-in photos within ±14 days of testDate
function findPhotosNear(
  testDate: Date,
  checkIns: { submittedAt: Date; photos: string[] }[],
  max: number,
): string[] {
  const result: string[] = [];
  for (const ci of checkIns) {
    if (Math.abs(ci.submittedAt.getTime() - testDate.getTime()) <= FOURTEEN_DAYS_MS) {
      for (const p of ci.photos) {
        if (result.length >= max) break;
        result.push(p);
      }
    }
    if (result.length >= max) break;
  }
  return result;
}

const STREAK_MILESTONES_SET = new Set(STREAK_MILESTONES_DAYS);

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

    let streak = 0;
    let startStr: string;
    if (dateSet.has(todayStr)) {
      startStr = todayStr;
    } else if (dateSet.has(yesterdayStr)) {
      startStr = yesterdayStr;
    } else {
      return 0;
    }

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

    const planIdSet = new Set<string>();
    for (const log of logs) {
      if (log.planId) {
        planIdSet.add(log.planId.toString());
      }
    }

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
        return { date, logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false };
      }

      const loggedKcal = (
        log.meals as Array<{ items: Array<{ kcal: number }> }>
      ).reduce(
        (sum, meal) =>
          sum + meal.items.reduce((mSum, item) => mSum + item.kcal, 0),
        0,
      );

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

      return { date, logged: true, loggedKcal, targetKcal, targetMet };
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

    const dateFilter: Record<string, Date> = {};
    if (cursorDate) {
      dateFilter['$lt'] = cursorDate;
    }

    // Fetch all source data concurrently. Fetch ALL check-ins and body tests
    // (not cursor-filtered) so milestone detection has the full picture.
    const [sessions, allBodyTests, allCheckIns, user] = await Promise.all([
      this.workoutSessionModel
        .find({
          memberId: memberOid,
          completedAt: { $ne: null, ...dateFilter },
        })
        .sort({ completedAt: -1 })
        .lean(),
      // ALL body tests ascending — needed for milestone detection
      this.bodyTestModel
        .find({ memberId: memberOid })
        .sort({ date: 1 })
        .lean(),
      // ALL check-ins ascending — for milestone detection + timeline items
      this.checkInModel
        .find({ memberId: memberOid })
        .sort({ submittedAt: 1 })
        .lean(),
      this.userModel.findById(memberOid).select('createdAt').lean(),
    ]);

    // Build milestone snapshots from all body tests (sorted ascending)
    const snapshots: BodyTestSnapshot[] = allBodyTests.map((bt) => ({
      date: bt.date,
      bodyFatPct: bt.bodyFatPct,
      weight: bt.weight,
      leanMassKg: bt.leanMassKg,
      targetBodyFatPct: bt.targetBodyFatPct ?? null,
      targetWeight: bt.targetWeight ?? null,
    }));

    const checkInDates = allCheckIns.map((ci) => ci.submittedAt);

    // Cursor-filtered check-ins for timeline items (newest first)
    const checkIns = cursorDate
      ? allCheckIns.filter((ci) => ci.submittedAt < cursorDate).reverse()
      : [...allCheckIns].reverse();

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

    // Body tests — enrich with milestone data
    for (const bt of allBodyTests) {
      // Only include tests within cursor filter
      if (cursorDate && bt.date >= cursorDate) continue;

      const globalIndex = allBodyTests.findIndex(
        (t) => t._id.toString() === bt._id.toString(),
      );
      const prev = globalIndex > 0 ? allBodyTests[globalIndex - 1] : null;

      const triggers = evaluateMilestone(globalIndex, snapshots, checkInDates);
      const milestone: MilestoneInfo | null =
        triggers.length > 0
          ? {
              emoji: selectEmoji(triggers),
              title: buildMilestoneTitle(triggers),
              tags: triggers.map((t) => ({ label: t.label, color: t.color })),
              photos: findPhotosNear(
                bt.date,
                allCheckIns.map((ci) => ({
                  submittedAt: ci.submittedAt,
                  photos: (ci.photos as string[]) ?? [],
                })),
                3,
              ),
            }
          : null;

      raw.push({
        id: bt._id.toString(),
        type: 'body_test',
        date: bt.date.toISOString(),
        testNumber: globalIndex + 1,
        weight: bt.weight,
        bodyFatPct: bt.bodyFatPct,
        leanMassKg: bt.leanMassKg,
        fatMassKg: bt.fatMassKg,
        deltaBodyFatPct:
          prev !== null
            ? Math.round((bt.bodyFatPct - prev.bodyFatPct) * 10) / 10
            : null,
        deltaWeight:
          prev !== null
            ? Math.round((bt.weight - prev.weight) * 10) / 10
            : null,
        milestone,
      });
    }

    for (const ci of checkIns) {
      // Corrected wellness avg: invert stress and fatigue
      const fields = [
        ci.sleepQuality,
        ci.energy,
        ci.recovery,
        10 - ci.stress,
        10 - ci.fatigue,
        ci.hunger,
        ci.digestion,
      ] as number[];
      const wellnessAvg = fields.reduce((sum, v) => sum + v, 0) / fields.length;
      raw.push({
        id: ci._id.toString(),
        type: 'check_in',
        date: ci.submittedAt.toISOString(),
        wellnessAvg: Math.round(wellnessAvg * 10) / 10,
      });
    }

    // Streak milestones
    const completedDates = sessions
      .filter((s) => s.completedAt)
      .map((s) => (s.completedAt as Date).toISOString().slice(0, 10))
      .sort();

    const milestoneItems = this.computeStreakMilestones(completedDates);
    raw.push(...milestoneItems);

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

    raw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const page = raw.slice(0, limit);
    const hasMore = raw.length > limit;
    const nextCursor = hasMore ? page[page.length - 1].date : null;

    return { items: page, nextCursor };
  }

  private computeStreakMilestones(
    sortedDates: string[],
  ): StreakMilestoneItem[] {
    if (sortedDates.length === 0) return [];

    const dateSet = new Set(sortedDates);
    const uniqueDates = [...dateSet].sort();

    const milestones: StreakMilestoneItem[] = [];
    const emittedMilestones = new Set<string>();

    for (let i = 0; i < uniqueDates.length; i++) {
      let streak = 0;
      let cursor = new Date(uniqueDates[i] + 'T00:00:00Z');
      while (dateSet.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor = new Date(cursor);
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }

      for (const threshold of STREAK_MILESTONES_SET) {
        if (streak >= threshold) {
          const milestoneDate = new Date(uniqueDates[i] + 'T00:00:00Z');
          milestoneDate.setUTCDate(
            milestoneDate.getUTCDate() - (streak - threshold),
          );
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
