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
import { BodyTest, BodyTestDocument } from '../../common/models/body-test.model';
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
  MemberDashboardResponse,
  MemberGreeting,
  TodaysPlan,
  MemberStats,
  BodyCompositionEntry,
  StrengthProgress,
  NutritionToday,
  UpcomingSession,
} from './dto/dashboard-response.types';

@Injectable()
export class MemberDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly sessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(ScheduledSession.name)
    private readonly scheduledSessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(PersonalBest.name)
    private readonly personalBestModel: Model<PersonalBestDocument>,
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(MemberNutritionPlan.name)
    private readonly memberNutritionPlanModel: Model<MemberNutritionPlanDocument>,
  ) {}

  async getMemberDashboard(
    memberId: string,
    exerciseFilter?: string,
  ): Promise<MemberDashboardResponse> {
    const memberObjId = new Types.ObjectId(memberId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    const [user, activePlan, activeNutritionPlan, bodyTests, personalBests] =
      await Promise.all([
        this.userModel.findById(memberObjId).lean(),
        this.memberPlanModel.findOne({ memberId: memberObjId, isActive: true }).lean(),
        this.memberNutritionPlanModel.findOne({ memberId: memberObjId, isActive: true }).lean(),
        this.bodyTestModel
          .find({ memberId: memberObjId })
          .sort({ date: -1 })
          .limit(8)
          .lean(),
        this.personalBestModel.find({ memberId: memberObjId }).lean(),
      ]);

    // Greeting
    const greeting: MemberGreeting = {
      firstName: user?.firstName ?? 'there',
      streakDays: await this.getStreakDays(memberObjId, now),
    };

    // Today's plan
    const todaysPlan = this.buildTodaysPlan(activePlan, now);

    // Stats
    const sessionsThisMonth = await this.sessionModel.countDocuments({
      memberId: memberObjId,
      completedAt: { $gte: startOfMonth },
    });

    const latestTest = bodyTests[0] ?? null;
    const previousTest = bodyTests[1] ?? null;

    const topPb =
      personalBests.length > 0
        ? personalBests.reduce((best, pb) =>
            pb.estimatedOneRM > best.estimatedOneRM ? pb : best,
          )
        : null;

    const startOfMonthForPR = new Date(now.getFullYear(), now.getMonth(), 1);
    const newPRThisMonth = topPb
      ? new Date(topPb.achievedAt) >= startOfMonthForPR
      : false;

    const stats: MemberStats = {
      sessionsThisMonth,
      latestWeight: latestTest?.weight ?? null,
      previousWeight: previousTest?.weight ?? null,
      latestBodyFat: latestTest?.bodyFatPct ?? null,
      previousBodyFat: previousTest?.bodyFatPct ?? null,
      topPR: topPb
        ? { exercise: topPb.exerciseName, estimatedOneRM: topPb.estimatedOneRM }
        : null,
      newPRThisMonth,
    };

    // Training heatmap: 90 booleans, index 0 = 90 days ago, index 89 = today
    const trainingHeatmap = await this.buildHeatmap(memberObjId, ninetyDaysAgo, now);

    // Body composition: last 8 body tests oldest first
    const bodyComposition: BodyCompositionEntry[] = [...bodyTests]
      .reverse()
      .map((t) => ({
        date: new Date(t.date).toISOString().split('T')[0],
        weight: t.weight,
        bodyFat: t.bodyFatPct,
      }));

    // Strength progress
    const strengthProgress = await this.buildStrengthProgress(
      memberObjId,
      personalBests,
      exerciseFilter,
    );

    // Nutrition today
    const nutritionToday = this.buildNutritionToday(activeNutritionPlan, now);

    // Upcoming sessions (next 3)
    const upcomingSessions = await this.getUpcomingSessions(memberObjId, now);

    return {
      greeting,
      todaysPlan,
      stats,
      trainingHeatmap,
      bodyComposition,
      strengthProgress,
      nutritionToday,
      upcomingSessions,
    };
  }

  private async getStreakDays(
    memberObjId: Types.ObjectId,
    now: Date,
  ): Promise<number> {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const sessions = await this.sessionModel
      .find({
        memberId: memberObjId,
        completedAt: { $gte: ninetyDaysAgo },
      })
      .lean();

    const key = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const daySet = new Set(
      sessions.flatMap((s) =>
        s.completedAt ? [key(new Date(s.completedAt))] : [],
      ),
    );

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (daySet.has(key(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  private buildTodaysPlan(
    activePlan: (MemberPlanDocument & {
      name: string;
      days: Array<{
        dayNumber: number;
        name: string;
        exercises: Array<{
          exerciseName: string;
          sets: number;
        }>;
      }>;
    }) | null,
    now: Date,
  ): TodaysPlan | null {
    if (!activePlan) return null;

    // Use first day of the plan as today's plan (simplified mapping)
    const day = activePlan.days[0] ?? null;
    if (!day) return null;

    const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
    const estimatedMinutes = Math.max(15, Math.ceil((totalSets * 2.5) / 5) * 5);

    return {
      planName: activePlan.name,
      dayType: day.name,
      exercises: day.exercises.map((e) => ({ name: e.exerciseName })),
      exerciseCount: day.exercises.length,
      setCount: totalSets,
      estimatedMinutes,
      scheduledTime: null,
    };
  }

  private async buildHeatmap(
    memberObjId: Types.ObjectId,
    ninetyDaysAgo: Date,
    now: Date,
  ): Promise<boolean[]> {
    const sessions = await this.sessionModel
      .find({
        memberId: memberObjId,
        completedAt: { $gte: ninetyDaysAgo },
      })
      .lean();

    const key = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const daySet = new Set(
      sessions.flatMap((s) =>
        s.completedAt ? [key(new Date(s.completedAt))] : [],
      ),
    );

    return Array.from({ length: 90 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (89 - i));
      d.setHours(0, 0, 0, 0);
      return daySet.has(key(d));
    });
  }

  private async buildStrengthProgress(
    memberObjId: Types.ObjectId,
    personalBests: PersonalBestDocument[],
    exerciseFilter?: string,
  ): Promise<StrengthProgress> {
    if (personalBests.length === 0) {
      return { exercises: [], data: [] };
    }

    // Deduplicate exercise names preserving first occurrence
    const seen = new Set<string>();
    const exercises: string[] = [];
    for (const pb of personalBests) {
      if (!seen.has(pb.exerciseName)) {
        seen.add(pb.exerciseName);
        exercises.push(pb.exerciseName);
      }
    }

    const targetExercise =
      exerciseFilter && exercises.includes(exerciseFilter)
        ? exerciseFilter
        : exercises[0];

    // Get estimated 1RM series for the target exercise from workout sessions
    const seriesRaw = await this.sessionModel.aggregate<{
      date: Date;
      estimatedOneRM: number;
    }>([
      {
        $match: {
          memberId: memberObjId,
          completedAt: { $ne: null },
          'sets.exerciseName': targetExercise,
        },
      },
      { $unwind: '$sets' },
      {
        $match: {
          'sets.exerciseName': targetExercise,
          'sets.actualWeight': { $ne: null },
          'sets.actualReps': { $ne: null },
          'sets.completedAt': { $ne: null },
        },
      },
      {
        $project: {
          date: '$completedAt',
          // Epley 1RM formula: weight * (1 + reps / 30)
          estimatedOneRM: {
            $multiply: [
              '$sets.actualWeight',
              { $add: [1, { $divide: ['$sets.actualReps', 30] }] },
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ]);

    const data = seriesRaw.map((r) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      estimatedOneRM: Math.round(r.estimatedOneRM * 10) / 10,
    }));

    return { exercises, data };
  }

  private buildNutritionToday(
    nutritionPlan: (MemberNutritionPlanDocument & {
      dayTypes: Array<{
        name: string;
        meals: Array<{
          items: Array<{
            protein: number;
            carbs: number;
            fat: number;
            kcal: number;
          }>;
        }>;
      }>;
      schedule: {
        weeklyPattern: Array<{ dayOfWeek: number; dayTypeName: string }>;
        calendarOverrides: Array<{ date: string; dayTypeName: string }>;
      };
    }) | null,
    now: Date,
  ): NutritionToday | null {
    if (!nutritionPlan) return null;

    // Determine today's day type from schedule
    const todayStr = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();

    let dayTypeName: string | null = null;

    // Check calendar overrides first
    const override = nutritionPlan.schedule.calendarOverrides.find(
      (o) => o.date === todayStr,
    );
    if (override) {
      dayTypeName = override.dayTypeName;
    } else {
      const pattern = nutritionPlan.schedule.weeklyPattern.find(
        (p) => p.dayOfWeek === dayOfWeek,
      );
      if (pattern) {
        dayTypeName = pattern.dayTypeName;
      }
    }

    if (!dayTypeName) {
      // Fall back to first day type
      dayTypeName = nutritionPlan.dayTypes[0]?.name ?? null;
    }

    if (!dayTypeName) return null;

    const dayType = nutritionPlan.dayTypes.find((d) => d.name === dayTypeName);
    if (!dayType) return null;

    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let calories = 0;

    for (const meal of dayType.meals) {
      for (const item of meal.items) {
        protein += item.protein;
        carbs += item.carbs;
        fat += item.fat;
        calories += item.kcal;
      }
    }

    return {
      dayType: dayTypeName,
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      calories: Math.round(calories),
    };
  }

  private async getUpcomingSessions(
    memberObjId: Types.ObjectId,
    now: Date,
  ): Promise<UpcomingSession[]> {
    const threeDaysLater = new Date(now.getTime() + 3 * 86400000);

    const sessions = await this.scheduledSessionModel
      .find({
        memberIds: memberObjId,
        date: { $gte: now, $lte: threeDaysLater },
        status: 'scheduled',
      })
      .sort({ date: 1 })
      .limit(3)
      .lean();

    return sessions.map((s) => {
      const sessionDate = new Date(s.date);
      const daysFromNow = Math.floor(
        (sessionDate.getTime() - now.getTime()) / 86400000,
      );
      const isGroup = s.memberIds.length > 1;

      return {
        datetime: sessionDate.toISOString(),
        type: isGroup ? 'group' : 'individual',
        groupSize: isGroup ? s.memberIds.length : null,
        daysFromNow,
      };
    });
  }
}
