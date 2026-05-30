import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MemberPortalService } from './member-portal.service';
import type { BodyTestRepository } from '../repositories/body-test.repository';
import type { PersonalBestRepository } from '../repositories/personal-best.repository';
import type { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import type { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import type { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import type { MemberPlanRepository } from '../repositories/member-plan.repository';
import type { CheckInRepository } from '../repositories/check-in.repository';
import type { IBodyTest } from '../database/models/body-test.model';
import type { IPersonalBest } from '../database/models/personal-best.model';
import type { IScheduledSession } from '../database/models/scheduled-session.model';
import type { IMemberNutritionPlan } from '../database/models/member-nutrition-plan.model';
import { Types } from 'mongoose';

function makeBodyTestRepo(
  overrides: Record<string, jest.Mock> = {},
): BodyTestRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as BodyTestRepository;
}

function makePbRepo(
  overrides: Record<string, jest.Mock> = {},
): PersonalBestRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as PersonalBestRepository;
}

function makeSessionRepo(
  overrides: Record<string, jest.Mock> = {},
): WorkoutSessionRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([]),
    findByDateRange: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as WorkoutSessionRepository;
}

function makeScheduledRepo(
  overrides: Record<string, jest.Mock> = {},
): ScheduledSessionRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ScheduledSessionRepository;
}

function makeNutritionPlanRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberNutritionPlanRepository {
  return {
    findActive: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as MemberNutritionPlanRepository;
}

function makeMemberPlanRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberPlanRepository {
  return {
    findActive: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as MemberPlanRepository;
}

function makeCheckInRepo(
  overrides: Record<string, jest.Mock> = {},
): CheckInRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as CheckInRepository;
}

function makeService(
  overrides: {
    bodyTestRepo?: BodyTestRepository;
    pbRepo?: PersonalBestRepository;
    sessionRepo?: WorkoutSessionRepository;
    scheduledRepo?: ScheduledSessionRepository;
    nutritionPlanRepo?: MemberNutritionPlanRepository;
    memberPlanRepo?: MemberPlanRepository;
    checkInRepo?: CheckInRepository;
  } = {},
): MemberPortalService {
  return new MemberPortalService(
    overrides.bodyTestRepo ?? makeBodyTestRepo(),
    overrides.pbRepo ?? makePbRepo(),
    overrides.sessionRepo ?? makeSessionRepo(),
    overrides.scheduledRepo ?? makeScheduledRepo(),
    overrides.nutritionPlanRepo ?? makeNutritionPlanRepo(),
    overrides.memberPlanRepo ?? makeMemberPlanRepo(),
    overrides.checkInRepo ?? makeCheckInRepo(),
  );
}

const memberId = new Types.ObjectId().toString();

describe('MemberPortalService', () => {
  describe('getDashboard', () => {
    it('returns hero, kpis, upcoming sessions, today nutrition for the current member', async () => {
      const bodyTestId = new Types.ObjectId();
      const bodyTests: Partial<IBodyTest>[] = [
        {
          _id: bodyTestId,
          memberId: new Types.ObjectId(memberId),
          date: new Date('2024-01-15'),
          bodyFatPct: 18.5,
          weight: 80.2,
          leanMassKg: 65.4,
          fatMassKg: 14.8,
          targetBodyFatPct: null,
          targetWeight: null,
        },
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(memberId),
          date: new Date('2024-02-15'),
          bodyFatPct: 17.2,
          weight: 79.8,
          leanMassKg: 66.1,
          fatMassKg: 13.7,
          targetBodyFatPct: null,
          targetWeight: null,
        },
      ];

      const pb: Partial<IPersonalBest> = {
        _id: new Types.ObjectId(),
        memberId: new Types.ObjectId(memberId),
        exerciseName: 'Squat',
        estimatedOneRM: 120.0,
        achievedAt: new Date('2024-02-10'),
      };

      const now = new Date();
      const future = new Date(now.getTime() + 2 * 86_400_000);
      const scheduledSession: Partial<IScheduledSession> = {
        _id: new Types.ObjectId(),
        date: future,
        startTime: '09:00',
        status: 'scheduled',
        memberIds: [new Types.ObjectId(memberId)],
      };

      const nutritionPlan: Partial<IMemberNutritionPlan> = {
        _id: new Types.ObjectId(),
        memberId: new Types.ObjectId(memberId),
        isActive: true,
        assignedAt: new Date('2024-01-01'),
        dayTypes: [
          {
            name: 'Training Day',
            meals: [
              {
                name: 'Breakfast',
                items: [
                  { name: 'Oats', protein: 10, carbs: 40, fat: 5, kcal: 245 },
                ],
              },
            ],
          },
        ],
        schedule: {
          weeklyPattern: [
            { dayOfWeek: 0, dayTypeName: 'Training Day' },
            { dayOfWeek: 1, dayTypeName: 'Training Day' },
            { dayOfWeek: 2, dayTypeName: 'Training Day' },
            { dayOfWeek: 3, dayTypeName: 'Training Day' },
            { dayOfWeek: 4, dayTypeName: 'Training Day' },
            { dayOfWeek: 5, dayTypeName: 'Training Day' },
            { dayOfWeek: 6, dayTypeName: 'Training Day' },
          ],
          calendarOverrides: [],
          iterate: true,
        },
      };

      const svc = makeService({
        bodyTestRepo: makeBodyTestRepo({
          findByMember: jest.fn().mockResolvedValue(bodyTests),
        }),
        pbRepo: makePbRepo({
          findByMember: jest.fn().mockResolvedValue([pb]),
        }),
        sessionRepo: makeSessionRepo({
          findByMember: jest
            .fn()
            .mockResolvedValue([
              { completedAt: new Date('2024-02-01') },
              { completedAt: new Date('2024-02-02') },
            ]),
        }),
        scheduledRepo: makeScheduledRepo({
          findByMember: jest.fn().mockResolvedValue([scheduledSession]),
        }),
        nutritionPlanRepo: makeNutritionPlanRepo({
          findActive: jest.fn().mockResolvedValue(nutritionPlan),
        }),
      });

      const result = await svc.getDashboard(memberId);

      expect(typeof result.kpis.sessionsThisMonth).toBe('number');
      expect(typeof result.kpis.weightKg).toBe('string');
      expect(typeof result.kpis.bfPct).toBe('string');
      expect(result.kpis.topPrName).toBe('Squat');
      expect(result.kpis.topPrKg).toBe('120.0');

      expect(result.upcomingSessions).toHaveLength(1);
      expect(result.upcomingSessions[0].startTime).toBe('09:00');
      expect(typeof result.upcomingSessions[0]._id).toBe('string');

      expect(result.nutritionToday).not.toBeNull();
      expect(typeof result.nutritionToday!.protein).toBe('number');
      expect(typeof result.nutritionToday!.kcal).toBe('number');
    });

    it('returns null nutritionToday when no plan assigned', async () => {
      const svc = makeService();
      const result = await svc.getDashboard(memberId);
      expect(result.nutritionToday).toBeNull();
    });

    it('returns empty upcomingSessions when none scheduled', async () => {
      const svc = makeService();
      const result = await svc.getDashboard(memberId);
      expect(result.upcomingSessions).toEqual([]);
    });
  });

  describe('getJourney', () => {
    it('returns chronological milestone timeline', async () => {
      const bodyTests: Partial<IBodyTest>[] = [
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(memberId),
          date: new Date('2024-01-01'),
          bodyFatPct: 20.0,
          weight: 85.0,
          leanMassKg: 68.0,
          fatMassKg: 17.0,
          targetBodyFatPct: null,
          targetWeight: null,
        },
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(memberId),
          date: new Date('2024-02-01'),
          bodyFatPct: 18.5,
          weight: 83.0,
          leanMassKg: 67.6,
          fatMassKg: 15.4,
          targetBodyFatPct: null,
          targetWeight: null,
        },
      ];

      const svc = makeService({
        bodyTestRepo: makeBodyTestRepo({
          findByMember: jest.fn().mockResolvedValue([...bodyTests].reverse()),
        }),
      });

      const result = await svc.getJourney(memberId, memberId);

      expect(result.items).toHaveLength(2);
      expect(result.summary).not.toBeNull();
      expect(result.summary!.totalTests).toBe(2);
      // newest first (cursor-paginated, descending)
      expect(new Date(result.items[0].bodyTest.date).getTime()).toBeGreaterThan(
        new Date(result.items[1].bodyTest.date).getTime(),
      );
    });

    it('returns empty response when no body tests exist', async () => {
      const svc = makeService();
      const result = await svc.getJourney(memberId, memberId);
      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      expect(result.summary).toBeNull();
    });
  });

  describe('getActivePlan', () => {
    it('returns serialized plan when one is active', async () => {
      const planId = new Types.ObjectId();
      const templateId = new Types.ObjectId();
      const exerciseId = new Types.ObjectId();
      const activePlan = {
        _id: planId,
        memberId: new Types.ObjectId(memberId),
        trainerId: new Types.ObjectId(),
        templateId,
        name: 'Push-Pull-Legs',
        isActive: true,
        assignedAt: new Date('2024-01-01'),
        days: [
          {
            dayNumber: 1,
            name: 'Push',
            exercises: [
              {
                groupId: 'g1',
                isSuperset: false,
                exerciseId,
                exerciseName: 'Bench Press',
                imageUrl: null,
                isBodyweight: false,
                sets: 3,
                repsMin: 8,
                repsMax: 12,
                restSeconds: 90,
              },
            ],
          },
        ],
      };

      const svc = makeService({
        memberPlanRepo: makeMemberPlanRepo({
          findActive: jest.fn().mockResolvedValue(activePlan),
        }),
      });

      const result = await svc.getActivePlan(memberId);
      expect(result).not.toBeNull();
      expect(result!._id).toBe(planId.toString());
      expect(result!.templateId).toBe(templateId.toString());
      expect(result!.name).toBe('Push-Pull-Legs');
      expect(result!.days).toHaveLength(1);
      expect(result!.days[0].exercises[0].exerciseId).toBe(exerciseId.toString());
    });

    it('returns null when no plan is active', async () => {
      const svc = makeService();
      const result = await svc.getActivePlan(memberId);
      expect(result).toBeNull();
    });
  });

  describe('guards', () => {
    it('a member cannot read another member data via getJourney', async () => {
      const otherMemberId = new Types.ObjectId().toString();
      const svc = makeService();

      await expect(svc.getJourney(otherMemberId, memberId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
