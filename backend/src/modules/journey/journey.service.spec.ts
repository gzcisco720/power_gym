import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JourneyService } from './journey.service';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { NutritionDailyLog } from '../../common/models/nutrition-daily-log.model';
import { BodyTest } from '../../common/models/body-test.model';
import { MemberNutritionPlan } from '../../common/models/member-nutrition-plan.model';

const MEMBER_ID = new Types.ObjectId().toString();

// Helper to build a date string YYYY-MM-DD offset by N days from today
function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function makeFinishedSession(completedAtDate: Date, completedSetCount = 2) {
  const sets = Array.from({ length: 3 }, (_, i) => ({
    completedAt: i < completedSetCount ? completedAtDate : null,
  }));
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(MEMBER_ID),
    dayName: 'Day 1',
    completedAt: completedAtDate,
    sets,
  };
}

describe('JourneyService', () => {
  let service: JourneyService;
  let workoutSessionModel: { find: jest.Mock };
  let nutritionDailyLogModel: { find: jest.Mock };
  let bodyTestModel: { find: jest.Mock };
  let memberNutritionPlanModel: { find: jest.Mock };

  beforeEach(async () => {
    workoutSessionModel = { find: jest.fn() };
    nutritionDailyLogModel = { find: jest.fn() };
    bodyTestModel = { find: jest.fn() };
    memberNutritionPlanModel = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: workoutSessionModel,
        },
        {
          provide: getModelToken(NutritionDailyLog.name),
          useValue: nutritionDailyLogModel,
        },
        {
          provide: getModelToken(BodyTest.name),
          useValue: bodyTestModel,
        },
        {
          provide: getModelToken(MemberNutritionPlan.name),
          useValue: memberNutritionPlanModel,
        },
      ],
    }).compile();

    service = module.get<JourneyService>(JourneyService);
  });

  // ─── computeStreak ────────────────────────────────────────────────────────────

  describe('computeStreak', () => {
    it('returns 0 when member has no finished sessions', async () => {
      workoutSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const streak = await service.computeStreak(MEMBER_ID);
      expect(streak).toBe(0);
    });

    it('counts consecutive days ending today (today + yesterday finished → 2)', async () => {
      const today = new Date(dateStr(0) + 'T10:00:00Z');
      const yesterday = new Date(dateStr(-1) + 'T10:00:00Z');

      workoutSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { completedAt: today },
              { completedAt: yesterday },
            ]),
        }),
      });

      const streak = await service.computeStreak(MEMBER_ID);
      expect(streak).toBe(2);
    });

    it('counts from yesterday when today has no finished session but yesterday does', async () => {
      const yesterday = new Date(dateStr(-1) + 'T10:00:00Z');
      const twoDaysAgo = new Date(dateStr(-2) + 'T10:00:00Z');

      workoutSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { completedAt: yesterday },
              { completedAt: twoDaysAgo },
            ]),
        }),
      });

      const streak = await service.computeStreak(MEMBER_ID);
      expect(streak).toBe(2);
    });

    it('stops at the first gap (today + 2-days-ago finished, yesterday missing → 1)', async () => {
      const today = new Date(dateStr(0) + 'T10:00:00Z');
      const twoDaysAgo = new Date(dateStr(-2) + 'T10:00:00Z');

      workoutSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { completedAt: today },
              { completedAt: twoDaysAgo },
            ]),
        }),
      });

      const streak = await service.computeStreak(MEMBER_ID);
      expect(streak).toBe(1);
    });
  });

  // ─── getRecentSessions ────────────────────────────────────────────────────────

  describe('getRecentSessions', () => {
    it('returns only finished sessions, most recent first, capped at 7, with completedSetCount counting sets where completedAt !== null', async () => {
      const now = new Date();
      const sessions = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        return makeFinishedSession(d, i % 3);
      });

      const mockSort = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(sessions.slice(0, 7)),
        }),
      });
      workoutSessionModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.getRecentSessions(MEMBER_ID);

      expect(result).toHaveLength(7);
      expect(workoutSessionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: new Types.ObjectId(MEMBER_ID),
          completedAt: { $ne: null },
        }),
      );
      // Each result has the expected shape
      result.forEach((s) => {
        expect(s).toHaveProperty('_id');
        expect(s).toHaveProperty('date');
        expect(s).toHaveProperty('dayName');
        expect(s).toHaveProperty('completedSetCount');
        expect(typeof s.completedSetCount).toBe('number');
      });
    });
  });

  // ─── getNutritionDays ─────────────────────────────────────────────────────────

  describe('getNutritionDays', () => {
    it('returns exactly 7 days oldest→newest, marks logged=false and loggedKcal=0 for days with no log', async () => {
      // Only provide a log for today
      const todayStr = dateStr(0);
      const log = {
        date: todayStr,
        planId: null,
        dayTypeName: 'Normal',
        meals: [{ items: [{ kcal: 500 }] }],
      };

      nutritionDailyLogModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([log]),
      });
      memberNutritionPlanModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getNutritionDays(MEMBER_ID);

      expect(result).toHaveLength(7);
      // Oldest is first
      expect(result[0].date).toBe(dateStr(-6));
      // Today is last
      expect(result[6].date).toBe(todayStr);

      // Days without a log
      for (let i = 0; i < 6; i++) {
        expect(result[i].logged).toBe(false);
        expect(result[i].loggedKcal).toBe(0);
      }
    });

    it('sets targetMet=true when plan day-type kcal target is met, false when no plan exists', async () => {
      const todayStr = dateStr(0);
      const planId = new Types.ObjectId();

      // Case 1: log with a plan that has a day-type with 1800 kcal target
      const logWithPlan = {
        date: todayStr,
        planId,
        dayTypeName: 'Normal',
        meals: [
          {
            items: [{ kcal: 1000 }, { kcal: 1000 }],
          },
        ],
      };

      nutritionDailyLogModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([logWithPlan]),
      });
      memberNutritionPlanModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: planId,
            dayTypes: [
              {
                name: 'Normal',
                meals: [{ items: [{ kcal: 900 }, { kcal: 900 }] }],
              },
            ],
          },
        ]),
      });

      const resultWithPlan = await service.getNutritionDays(MEMBER_ID);
      const todayWithPlan = resultWithPlan.find((d) => d.date === todayStr);

      expect(todayWithPlan).toBeDefined();
      expect(todayWithPlan!.logged).toBe(true);
      expect(todayWithPlan!.loggedKcal).toBe(2000);
      expect(todayWithPlan!.targetKcal).toBe(1800);
      expect(todayWithPlan!.targetMet).toBe(true);

      // Case 2: log with no planId → targetKcal=0, targetMet=false
      const logNoPlan = {
        date: todayStr,
        planId: null,
        dayTypeName: 'Normal',
        meals: [{ items: [{ kcal: 2000 }] }],
      };

      nutritionDailyLogModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([logNoPlan]),
      });
      memberNutritionPlanModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const resultNoPlan = await service.getNutritionDays(MEMBER_ID);
      const todayNoPlan = resultNoPlan.find((d) => d.date === todayStr);

      expect(todayNoPlan).toBeDefined();
      expect(todayNoPlan!.targetKcal).toBe(0);
      expect(todayNoPlan!.targetMet).toBe(false);
    });
  });

  // ─── getBodyTests ─────────────────────────────────────────────────────────────

  describe('getBodyTests', () => {
    it('returns up to 10 tests most recent first with weight and bodyFatPct mapped', async () => {
      const tests = Array.from({ length: 12 }, (_, i) => ({
        _id: new Types.ObjectId(),
        date: new Date(dateStr(-i) + 'T10:00:00Z'),
        weight: 80 + i,
        bodyFatPct: 15 + i * 0.5,
      }));

      bodyTestModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(tests.slice(0, 10)),
          }),
        }),
      });

      const result = await service.getBodyTests(MEMBER_ID);

      expect(result).toHaveLength(10);
      result.forEach((t) => {
        expect(t).toHaveProperty('_id');
        expect(t).toHaveProperty('date');
        expect(t).toHaveProperty('weight');
        expect(t).toHaveProperty('bodyFatPct');
      });
    });
  });

  // ─── getSummary ───────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('composes streak, sessions, nutritionDays, and bodyTests into one object', async () => {
      // computeStreak mock
      workoutSessionModel.find
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        })
        // getRecentSessions mock
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      nutritionDailyLogModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      memberNutritionPlanModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      bodyTestModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getSummary(MEMBER_ID);

      expect(result).toHaveProperty('workoutStreak', 0);
      expect(result).toHaveProperty('recentSessions');
      expect(Array.isArray(result.recentSessions)).toBe(true);
      expect(result).toHaveProperty('nutritionDays');
      expect(result.nutritionDays).toHaveLength(7);
      expect(result).toHaveProperty('bodyTests');
      expect(Array.isArray(result.bodyTests)).toBe(true);
    });
  });
});
