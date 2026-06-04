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
}
