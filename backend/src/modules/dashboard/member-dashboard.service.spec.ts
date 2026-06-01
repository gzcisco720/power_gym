import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MemberDashboardService } from './member-dashboard.service';
import { User } from '../../common/models/user.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { BodyTest } from '../../common/models/body-test.model';
import { PersonalBest } from '../../common/models/personal-best.model';
import { MemberPlan } from '../../common/models/member-plan.model';
import { MemberNutritionPlan } from '../../common/models/member-nutrition-plan.model';

describe('MemberDashboardService', () => {
  let service: MemberDashboardService;

  const userModelMock = { findById: jest.fn() };
  const sessionModelMock = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };
  const scheduledSessionModelMock = { find: jest.fn() };
  const bodyTestModelMock = { find: jest.fn() };
  const personalBestModelMock = { find: jest.fn() };
  const memberPlanModelMock = { findOne: jest.fn() };
  const memberNutritionPlanModelMock = { findOne: jest.fn() };

  const memberId = new Types.ObjectId();
  const memberUser = {
    _id: memberId,
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'member',
    trainerId: new Types.ObjectId(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberDashboardService,
        { provide: getModelToken(User.name), useValue: userModelMock },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: sessionModelMock,
        },
        {
          provide: getModelToken(ScheduledSession.name),
          useValue: scheduledSessionModelMock,
        },
        { provide: getModelToken(BodyTest.name), useValue: bodyTestModelMock },
        {
          provide: getModelToken(PersonalBest.name),
          useValue: personalBestModelMock,
        },
        {
          provide: getModelToken(MemberPlan.name),
          useValue: memberPlanModelMock,
        },
        {
          provide: getModelToken(MemberNutritionPlan.name),
          useValue: memberNutritionPlanModelMock,
        },
      ],
    }).compile();

    service = module.get<MemberDashboardService>(MemberDashboardService);
  });

  function setupBase() {
    userModelMock.findById.mockImplementation(() => ({
      lean: () => Promise.resolve(memberUser),
    }));

    sessionModelMock.find.mockImplementation(() => ({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
      lean: () => Promise.resolve([]),
    }));
    sessionModelMock.countDocuments.mockResolvedValue(0);
    sessionModelMock.aggregate.mockResolvedValue([]);

    scheduledSessionModelMock.find.mockImplementation(() => ({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([]),
        }),
      }),
    }));

    bodyTestModelMock.find.mockImplementation(() => ({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([]),
        }),
      }),
    }));

    personalBestModelMock.find.mockImplementation(() => ({
      lean: () => Promise.resolve([]),
    }));

    memberPlanModelMock.findOne.mockImplementation(() => ({
      lean: () => Promise.resolve(null),
    }));

    memberNutritionPlanModelMock.findOne.mockImplementation(() => ({
      lean: () => Promise.resolve(null),
    }));
  }

  describe('getMemberDashboard', () => {
    it('trainingHeatmap has exactly 90 boolean entries, index 89 = today', async () => {
      setupBase();

      // Seed a completed session today to verify index 89 = true
      const todayDate = new Date();
      todayDate.setHours(12, 0, 0, 0);
      sessionModelMock.find.mockImplementation(
        (query: { completedAt?: { $gte: Date } }) => {
          if (query.completedAt) {
            return {
              lean: () => Promise.resolve([{ completedAt: todayDate }]),
            };
          }
          return {
            sort: () => ({ lean: () => Promise.resolve([]) }),
            lean: () => Promise.resolve([]),
          };
        },
      );

      const result = await service.getMemberDashboard(memberId.toString());

      expect(result.trainingHeatmap).toHaveLength(90);
      result.trainingHeatmap.forEach((v) => expect(typeof v).toBe('boolean'));
      expect(result.trainingHeatmap[89]).toBe(true); // today has a session
    });

    it('strengthProgress defaults to first exercise when no exercise query is given', async () => {
      setupBase();

      // Two exercises worth of personal bests
      const ex1Id = new Types.ObjectId();
      const ex2Id = new Types.ObjectId();
      const pbs = [
        {
          memberId,
          exerciseId: ex1Id,
          exerciseName: 'Bench Press',
          estimatedOneRM: 100,
          achievedAt: new Date(Date.now() - 10 * 86400000),
          sessionId: new Types.ObjectId(),
          bestWeight: 90,
          bestReps: 5,
        },
        {
          memberId,
          exerciseId: ex2Id,
          exerciseName: 'Squat',
          estimatedOneRM: 120,
          achievedAt: new Date(Date.now() - 5 * 86400000),
          sessionId: new Types.ObjectId(),
          bestWeight: 100,
          bestReps: 5,
        },
      ];

      personalBestModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve(pbs),
      }));

      // Workout sessions with exerciseName (for 1RM series)
      sessionModelMock.aggregate.mockResolvedValue([
        { date: new Date(Date.now() - 10 * 86400000), estimatedOneRM: 100 },
      ]);

      const result = await service.getMemberDashboard(memberId.toString());

      // exercises list should contain both exercise names
      expect(result.strengthProgress.exercises).toContain('Bench Press');
      expect(result.strengthProgress.exercises).toContain('Squat');

      // default is first exercise (Bench Press)
      expect(result.strengthProgress.exercises[0]).toBe('Bench Press');
    });

    it('strengthProgress returns series for the requested exercise when exercise param is provided', async () => {
      setupBase();

      const ex1Id = new Types.ObjectId();
      const ex2Id = new Types.ObjectId();
      const pbs = [
        {
          memberId,
          exerciseId: ex1Id,
          exerciseName: 'Bench Press',
          estimatedOneRM: 100,
          achievedAt: new Date(Date.now() - 10 * 86400000),
          sessionId: new Types.ObjectId(),
          bestWeight: 90,
          bestReps: 5,
        },
        {
          memberId,
          exerciseId: ex2Id,
          exerciseName: 'Squat',
          estimatedOneRM: 120,
          achievedAt: new Date(Date.now() - 5 * 86400000),
          sessionId: new Types.ObjectId(),
          bestWeight: 100,
          bestReps: 5,
        },
      ];

      personalBestModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve(pbs),
      }));

      const squatDate = new Date(Date.now() - 5 * 86400000);
      sessionModelMock.aggregate.mockResolvedValue([
        { date: squatDate, estimatedOneRM: 120 },
      ]);

      const result = await service.getMemberDashboard(
        memberId.toString(),
        'Squat',
      );

      // The data array should be for Squat
      expect(result.strengthProgress.data.length).toBeGreaterThan(0);
      expect(result.strengthProgress.data[0].estimatedOneRM).toBe(120);

      // Verify the aggregate pipeline was called with a Squat-scoped $match
      const aggregateCalls = sessionModelMock.aggregate.mock.calls as Array<
        [Array<Record<string, unknown>>]
      >;
      const aggregateCall = aggregateCalls[0][0];
      const matchStage = aggregateCall.find((stage) => '$match' in stage) as
        | { $match: Record<string, unknown> }
        | undefined;
      expect(matchStage).toBeDefined();
      expect(matchStage!.$match['sets.exerciseName']).toBe('Squat');
    });

    it('todaysPlan is null when the member has no active member-plan', async () => {
      setupBase();
      // memberPlanModelMock.findOne already returns null from setupBase

      const result = await service.getMemberDashboard(memberId.toString());

      expect(result.todaysPlan).toBeNull();
    });
  });
});
