import { Injectable, ForbiddenException } from '@nestjs/common';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { CheckInRepository } from '../repositories/check-in.repository';
import type { IBodyTest } from '../database/models/body-test.model';
import type { ISchedule } from '../database/models/member-nutrition-plan.model';
import type { IScheduledSession } from '../database/models/scheduled-session.model';

// ──────────────────────────────────────────────────────────────────────────────
// Response types
// ──────────────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  sessionsThisMonth: number;
  activeStreak: number;
  weightKg: string;
  weightDelta: number | null;
  weightImproved: boolean;
  bfPct: string;
  bfDelta: number | null;
  bfImproved: boolean;
  topPrName: string;
  topPrKg: string;
  isNewPr: boolean;
}

export interface UpcomingSessionItem {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  memberCount: number;
}

export interface NutritionToday {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  dayTypeName: string;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  upcomingSessions: UpcomingSessionItem[];
  nutritionToday: NutritionToday | null;
  activePlan: { name: string; dayCount: number } | null;
}

// Journey types (v1-identical)
export type MilestoneTagColor = 'gold' | 'green' | 'indigo';

export interface MilestoneTag {
  label: string;
  color: MilestoneTagColor;
}

export interface MilestoneInfo {
  emoji: string;
  title: string;
  tags: MilestoneTag[];
  photos: string[];
}

export interface JourneyBodyTest {
  id: string;
  date: string;
  testNumber: number;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;
  deltaWeight: number | null;
}

export interface JourneyItem {
  bodyTest: JourneyBodyTest;
  checkInPhoto: string | null;
  milestone: MilestoneInfo | null;
}

export interface JourneySummary {
  totalTests: number;
  firstTestDate: string;
  firstBodyFatPct: number;
  firstWeight: number;
  firstLeanMassKg: number;
  latestBodyFatPct: number;
  latestWeight: number;
  latestLeanMassKg: number;
  leanMassDeltaKg: number;
}

export interface JourneyResponse {
  items: JourneyItem[];
  nextCursor: string | null;
  summary: JourneySummary | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers (ported from v1)
// ──────────────────────────────────────────────────────────────────────────────

interface BodyTestSnapshot {
  date: Date;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  targetBodyFatPct: number | null;
  targetWeight: number | null;
}

interface MilestoneTrigger {
  type:
    | 'goal_reached'
    | 'significant_change'
    | 'personal_best'
    | 'time_milestone'
    | 'checkin_streak';
  label: string;
  color: MilestoneTagColor;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * MS_PER_DAY;
const FOURTEEN_DAYS_MS = 14 * MS_PER_DAY;
const TIME_ANNIVERSARIES_MONTHS = [3, 6, 12];
const STREAK_THRESHOLDS = [30, 60, 100];

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

  if (index === 0) {
    triggers.push({
      type: 'time_milestone',
      label: 'Journey begins',
      color: 'indigo',
    });
  } else {
    const firstDate = tests[0].date;
    for (const months of TIME_ANNIVERSARIES_MONTHS) {
      const anniversary = addMonths(firstDate, months);
      if (
        Math.abs(test.date.getTime() - anniversary.getTime()) <= SEVEN_DAYS_MS
      ) {
        triggers.push({
          type: 'time_milestone',
          label: `${months === 12 ? '1-year' : `${months}-month`} milestone`,
          color: 'indigo',
        });
        break;
      }
    }
  }

  if (
    test.targetBodyFatPct !== null &&
    test.bodyFatPct <= test.targetBodyFatPct
  ) {
    const alreadyReached = earlier.some(
      (t) => t.targetBodyFatPct !== null && t.bodyFatPct <= t.targetBodyFatPct,
    );
    if (!alreadyReached) {
      triggers.push({
        type: 'goal_reached',
        label: '🎯 Body fat goal reached',
        color: 'gold',
      });
    }
  }
  if (test.targetWeight !== null && test.weight <= test.targetWeight) {
    const alreadyReached = earlier.some(
      (t) => t.targetWeight !== null && t.weight <= t.targetWeight,
    );
    if (!alreadyReached) {
      triggers.push({
        type: 'goal_reached',
        label: '🎯 Weight goal reached',
        color: 'gold',
      });
    }
  }

  if (prev) {
    if (prev.bodyFatPct - test.bodyFatPct >= 1.0) {
      triggers.push({
        type: 'significant_change',
        label: `⬇ Body fat −${(prev.bodyFatPct - test.bodyFatPct).toFixed(1)}%`,
        color: 'green',
      });
    }
    if (Math.abs(test.weight - prev.weight) >= 2.0) {
      triggers.push({
        type: 'significant_change',
        label: `Weight change ${Math.abs(test.weight - prev.weight).toFixed(1)} kg`,
        color: 'green',
      });
    }
  }

  const lowestBf =
    earlier.length > 0
      ? Math.min(...earlier.map((t) => t.bodyFatPct))
      : Infinity;
  if (test.bodyFatPct < lowestBf) {
    triggers.push({
      type: 'personal_best',
      label: '🥇 All-time low body fat',
      color: 'indigo',
    });
  }
  const highestLean =
    earlier.length > 0
      ? Math.max(...earlier.map((t) => t.leanMassKg))
      : -Infinity;
  if (test.leanMassKg > highestLean) {
    triggers.push({
      type: 'personal_best',
      label: '🏅 All-time high lean mass',
      color: 'indigo',
    });
  }

  const streakDates = STREAK_THRESHOLDS.flatMap((n) =>
    checkInDates.length >= n ? [{ count: n, date: checkInDates[n - 1] }] : [],
  );
  const nearbyStreaks = streakDates.filter(
    ({ date }) =>
      Math.abs(date.getTime() - test.date.getTime()) <= SEVEN_DAYS_MS,
  );
  const matchingStreak =
    nearbyStreaks.length > 0
      ? nearbyStreaks.reduce((best, s) => (s.count > best.count ? s : best))
      : undefined;
  if (matchingStreak) {
    triggers.push({
      type: 'checkin_streak',
      label: `✅ ${matchingStreak.count} check-in streak`,
      color: 'green',
    });
  }

  return triggers;
}

const EMOJI_PRIORITY: MilestoneTrigger['type'][] = [
  'goal_reached',
  'time_milestone',
  'personal_best',
  'significant_change',
  'checkin_streak',
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
    case 'goal_reached':
      return 'Goal achieved';
    case 'time_milestone':
      return triggers.find((t) => t.type === 'time_milestone')!.label;
    case 'personal_best':
      return 'New personal record';
    case 'significant_change':
      return 'Significant progress';
    case 'checkin_streak':
      return triggers.find((t) => t.type === 'checkin_streak')!.label;
    default:
      return 'Milestone';
  }
}

function findNearestPhoto(
  testDate: Date,
  checkIns: { submittedAt: Date; photos: string[] }[],
): string | null {
  const candidates = checkIns
    .filter(
      (c) =>
        c.photos.length > 0 &&
        Math.abs(c.submittedAt.getTime() - testDate.getTime()) <=
          FOURTEEN_DAYS_MS,
    )
    .sort(
      (a, b) =>
        Math.abs(a.submittedAt.getTime() - testDate.getTime()) -
        Math.abs(b.submittedAt.getTime() - testDate.getTime()),
    );
  return candidates[0]?.photos[0] ?? null;
}

function findPhotosNear(
  testDate: Date,
  checkIns: { submittedAt: Date; photos: string[] }[],
  max: number,
): string[] {
  const candidates = checkIns
    .filter(
      (c) =>
        c.photos.length > 0 &&
        Math.abs(c.submittedAt.getTime() - testDate.getTime()) <=
          FOURTEEN_DAYS_MS,
    )
    .sort(
      (a, b) =>
        Math.abs(a.submittedAt.getTime() - testDate.getTime()) -
        Math.abs(b.submittedAt.getTime() - testDate.getTime()),
    );
  return candidates.flatMap((c) => c.photos).slice(0, max);
}

function resolveDayType(
  schedule: ISchedule,
  dateISO: string,
  startDateISO: string,
): string | null {
  const override = schedule.calendarOverrides.find((o) => o.date === dateISO);
  if (override) return override.dayTypeName;
  if (schedule.weeklyPattern.length === 0) return null;
  const targetDate = new Date(`${dateISO}T00:00:00Z`);
  const startDate = new Date(`${startDateISO}T00:00:00Z`);
  const daysSinceStart = Math.floor(
    (targetDate.getTime() - startDate.getTime()) / 86400000,
  );
  if (daysSinceStart < 0) return null;
  if (!schedule.iterate && daysSinceStart >= 7) return null;
  const dayOfWeek = targetDate.getUTCDay();
  const entry = schedule.weeklyPattern.find((w) => w.dayOfWeek === dayOfWeek);
  return entry?.dayTypeName ?? null;
}

function computeStreak(completedAts: (Date | null | undefined)[]): number {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const daySet = new Set(
    completedAts.flatMap((d) => (d ? [toKey(new Date(d))] : [])),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!daySet.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (daySet.has(toKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function countCompletedThisMonth(
  completedAts: (Date | null | undefined)[],
  monthStart: Date,
): number {
  return completedAts.filter((d) => d && new Date(d) >= monthStart).length;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class MemberPortalService {
  constructor(
    private readonly bodyTestRepo: BodyTestRepository,
    private readonly pbRepo: PersonalBestRepository,
    private readonly sessionRepo: WorkoutSessionRepository,
    private readonly scheduledRepo: ScheduledSessionRepository,
    private readonly nutritionPlanRepo: MemberNutritionPlanRepository,
    private readonly memberPlanRepo: MemberPlanRepository,
    private readonly checkInRepo: CheckInRepository,
  ) {}

  async getDashboard(memberId: string): Promise<DashboardResponse> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      bodyTests,
      pbs,
      allSessions,
      scheduledSessions,
      nutritionPlan,
      activePlan,
    ] = await Promise.all([
      this.bodyTestRepo.findByMember(memberId),
      this.pbRepo.findByMember(memberId),
      this.sessionRepo.findByMember(memberId),
      this.scheduledRepo.findByMember(memberId),
      this.nutritionPlanRepo.findActive(memberId),
      this.memberPlanRepo.findActive(memberId),
    ]);

    // KPIs
    const latest: IBodyTest | null = bodyTests[0] ?? null;
    const previous: IBodyTest | null = bodyTests[1] ?? null;

    const completedAts = allSessions.map((s) => s.completedAt);
    const sessionsThisMonth = countCompletedThisMonth(completedAts, monthStart);
    const activeStreak = computeStreak(completedAts);

    const weightDelta =
      latest && previous
        ? parseFloat((latest.weight - previous.weight).toFixed(1))
        : null;
    const bfDelta =
      latest && previous
        ? parseFloat((latest.bodyFatPct - previous.bodyFatPct).toFixed(1))
        : null;

    const topPb =
      pbs.length > 0
        ? pbs.reduce((best, pb) =>
            pb.estimatedOneRM > best.estimatedOneRM ? pb : best,
          )
        : null;

    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const isNewPr = topPb ? new Date(topPb.achievedAt) > sevenDaysAgo : false;

    const kpis: DashboardKpis = {
      sessionsThisMonth,
      activeStreak,
      weightKg: latest ? latest.weight.toFixed(1) : '—',
      weightDelta,
      weightImproved: weightDelta !== null && weightDelta < 0,
      bfPct: latest ? latest.bodyFatPct.toFixed(1) : '—',
      bfDelta,
      bfImproved: bfDelta !== null && bfDelta < 0,
      topPrName: topPb ? topPb.exerciseName : 'Top PR',
      topPrKg: topPb ? topPb.estimatedOneRM.toFixed(1) : '—',
      isNewPr,
    };

    // Upcoming sessions (future, scheduled, max 3)
    const upcomingSessions: UpcomingSessionItem[] = scheduledSessions
      .filter(
        (s: IScheduledSession) => s.date >= now && s.status === 'scheduled',
      )
      .slice(0, 3)
      .map((s: IScheduledSession) => ({
        _id: s._id.toString(),
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        memberCount: s.memberIds.length,
      }));

    // Nutrition today
    let nutritionToday: NutritionToday | null = null;
    if (nutritionPlan) {
      const todayISO = now.toISOString().slice(0, 10);
      const startISO = new Date(nutritionPlan.assignedAt)
        .toISOString()
        .slice(0, 10);
      const dayTypeName = resolveDayType(
        nutritionPlan.schedule,
        todayISO,
        startISO,
      );
      const dayType =
        nutritionPlan.dayTypes.find((d) => d.name === dayTypeName) ??
        nutritionPlan.dayTypes[0] ??
        null;
      if (dayType) {
        const allItems = dayType.meals.flatMap((m) => m.items);
        const totals = allItems.reduce(
          (acc, item) => ({
            protein: acc.protein + item.protein,
            carbs: acc.carbs + item.carbs,
            fat: acc.fat + item.fat,
            kcal: acc.kcal + item.kcal,
          }),
          { protein: 0, carbs: 0, fat: 0, kcal: 0 },
        );
        nutritionToday = {
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fat: Math.round(totals.fat),
          kcal: Math.round(totals.kcal),
          dayTypeName: dayType.name,
        };
      }
    }

    const activePlanSummary: DashboardResponse['activePlan'] = activePlan
      ? { name: activePlan.name, dayCount: activePlan.days.length }
      : null;

    return {
      kpis,
      upcomingSessions,
      nutritionToday,
      activePlan: activePlanSummary,
    };
  }

  async getActivePlan(memberId: string): Promise<{
    _id: string;
    templateId: string;
    name: string;
    days: {
      dayNumber: number;
      name: string;
      exercises: {
        groupId: string;
        isSuperset: boolean;
        exerciseId: string;
        exerciseName: string;
        isBodyweight: boolean;
        sets: number;
        repsMin: number;
        repsMax: number;
      }[];
    }[];
  } | null> {
    const plan = await this.memberPlanRepo.findActive(memberId);
    if (!plan) return null;
    return {
      _id: plan._id.toString(),
      templateId: plan.templateId.toString(),
      name: plan.name,
      days: plan.days.map((d) => ({
        dayNumber: d.dayNumber,
        name: d.name,
        exercises: d.exercises.map((ex) => ({
          groupId: ex.groupId,
          isSuperset: ex.isSuperset,
          exerciseId: ex.exerciseId.toString(),
          exerciseName: ex.exerciseName,
          isBodyweight: ex.isBodyweight,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
        })),
      })),
    };
  }

  async getJourney(
    memberId: string,
    requesterId: string,
    cursor?: string,
    limit = 10,
  ): Promise<JourneyResponse> {
    if (requesterId !== memberId) {
      throw new ForbiddenException();
    }

    const safeLimit = Math.max(
      1,
      Math.min(Number.isFinite(limit) ? limit : 10, 50),
    );

    const [allTestsDesc, checkIns] = await Promise.all([
      this.bodyTestRepo.findByMember(memberId), // sorted desc by date
      this.checkInRepo.findByMember(memberId),
    ]);

    if (allTestsDesc.length === 0) {
      return { items: [], nextCursor: null, summary: null };
    }

    // ascending for milestone calculations
    const allTestsAsc = [...allTestsDesc].reverse();

    const first = allTestsAsc[0];
    const latest = allTestsAsc[allTestsAsc.length - 1];
    const summary: JourneySummary = {
      totalTests: allTestsAsc.length,
      firstTestDate: first.date.toISOString(),
      firstBodyFatPct: first.bodyFatPct,
      firstWeight: first.weight,
      firstLeanMassKg: first.leanMassKg,
      latestBodyFatPct: latest.bodyFatPct,
      latestWeight: latest.weight,
      latestLeanMassKg: latest.leanMassKg,
      leanMassDeltaKg:
        Math.round((latest.leanMassKg - first.leanMassKg) * 10) / 10,
    };

    const snapshots: BodyTestSnapshot[] = allTestsAsc.map((t) => ({
      date: t.date,
      bodyFatPct: t.bodyFatPct,
      weight: t.weight,
      leanMassKg: t.leanMassKg,
      targetBodyFatPct: t.targetBodyFatPct,
      targetWeight: t.targetWeight,
    }));

    const photoEntries = checkIns.map((c) => ({
      submittedAt: c.submittedAt,
      photos: c.photos,
    }));
    const checkInDates = photoEntries
      .map((c) => c.submittedAt)
      .sort((a, b) => a.getTime() - b.getTime());

    // Cursor pagination (newest-first)
    let descTests = [...allTestsDesc];
    if (cursor) {
      const cursorTime = new Date(cursor).getTime();
      if (!Number.isFinite(cursorTime)) {
        return { items: [], nextCursor: null, summary };
      }
      descTests = descTests.filter((t) => t.date.getTime() < cursorTime);
    }
    const pageSlice = descTests.slice(0, safeLimit);
    const nextCursor =
      pageSlice.length === safeLimit && descTests.length > safeLimit
        ? pageSlice[pageSlice.length - 1].date.toISOString()
        : null;

    const items: JourneyItem[] = pageSlice.map((test) => {
      const globalIndex = allTestsAsc.findIndex(
        (t) => t._id.toString() === test._id.toString(),
      );
      const triggers = evaluateMilestone(globalIndex, snapshots, checkInDates);
      const prev = globalIndex > 0 ? allTestsAsc[globalIndex - 1] : null;

      const milestone: MilestoneInfo | null =
        triggers.length > 0
          ? {
              emoji: selectEmoji(triggers),
              title: buildMilestoneTitle(triggers),
              tags: triggers.map((t) => ({ label: t.label, color: t.color })),
              photos: findPhotosNear(test.date, photoEntries, 3),
            }
          : null;

      return {
        bodyTest: {
          id: test._id.toString(),
          date: test.date.toISOString(),
          testNumber: globalIndex + 1,
          bodyFatPct: test.bodyFatPct,
          weight: test.weight,
          leanMassKg: test.leanMassKg,
          fatMassKg: test.fatMassKg,
          deltaBodyFatPct: prev
            ? Math.round((test.bodyFatPct - prev.bodyFatPct) * 10) / 10
            : null,
          deltaWeight: prev
            ? Math.round((test.weight - prev.weight) * 10) / 10
            : null,
        },
        checkInPhoto: findNearestPhoto(test.date, photoEntries),
        milestone,
      };
    });

    return { items, nextCursor, summary };
  }
}
