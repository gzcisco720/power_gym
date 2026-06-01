import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TrainerDashboardService } from './trainer-dashboard.service';
import { User } from '../../common/models/user.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { CheckIn } from '../../common/models/check-in.model';
import { PersonalBest } from '../../common/models/personal-best.model';
import { MemberPlan } from '../../common/models/member-plan.model';
import { MemberNutritionPlan } from '../../common/models/member-nutrition-plan.model';

function makeUser(
  role: 'owner' | 'trainer' | 'member',
  trainerId: Types.ObjectId | null = null,
) {
  return {
    _id: new Types.ObjectId(),
    role,
    trainerId,
    firstName: 'Test',
    lastName: 'User',
  };
}

describe('TrainerDashboardService', () => {
  let service: TrainerDashboardService;

  const userModelMock = { find: jest.fn() };
  const sessionModelMock = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };
  const scheduledSessionModelMock = { find: jest.fn() };
  const checkInModelMock = { find: jest.fn(), countDocuments: jest.fn() };
  const personalBestModelMock = { find: jest.fn() };
  const memberPlanModelMock = { find: jest.fn() };
  const memberNutritionPlanModelMock = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainerDashboardService,
        { provide: getModelToken(User.name), useValue: userModelMock },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: sessionModelMock,
        },
        {
          provide: getModelToken(ScheduledSession.name),
          useValue: scheduledSessionModelMock,
        },
        { provide: getModelToken(CheckIn.name), useValue: checkInModelMock },
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

    service = module.get<TrainerDashboardService>(TrainerDashboardService);
  });

  describe('getTrainerDashboard', () => {
    const trainerId = new Types.ObjectId();
    const member1 = {
      ...makeUser('member', trainerId),
      firstName: 'Alice',
      lastName: 'A',
    };
    const member2 = {
      ...makeUser('member', trainerId),
      firstName: 'Bob',
      lastName: 'B',
    };
    // member belonging to a different trainer
    const otherTrainerId = new Types.ObjectId();
    const member3 = {
      ...makeUser('member', otherTrainerId),
      firstName: 'Carol',
      lastName: 'C',
    };

    function setupBaseState() {
      // Only members whose trainerId === this trainer
      userModelMock.find.mockImplementation(
        (query: { trainerId?: Types.ObjectId }) => ({
          lean: () =>
            Promise.resolve(
              query.trainerId?.toString() === trainerId.toString()
                ? [member1, member2]
                : [],
            ),
        }),
      );

      // No scheduled sessions today by default
      scheduledSessionModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve([]),
      }));

      // No completed workout sessions
      sessionModelMock.find.mockImplementation(() => ({
        sort: () => ({
          lean: () => Promise.resolve([]),
        }),
        lean: () => Promise.resolve([]),
      }));
      sessionModelMock.countDocuments.mockResolvedValue(0);
      sessionModelMock.aggregate.mockResolvedValue([]);

      // No check-ins
      checkInModelMock.find.mockImplementation(() => ({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
        lean: () => Promise.resolve([]),
      }));
      checkInModelMock.countDocuments.mockResolvedValue(0);

      // No PRs
      personalBestModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve([]),
      }));

      // Active plans for all members
      memberPlanModelMock.find.mockImplementation(() => ({
        lean: () =>
          Promise.resolve([
            { memberId: member1._id, isActive: true, name: 'Plan A' },
            { memberId: member2._id, isActive: true, name: 'Plan B' },
          ]),
      }));

      // Nutrition plans for all members
      memberNutritionPlanModelMock.find.mockImplementation(() => ({
        lean: () =>
          Promise.resolve([
            { memberId: member1._id, isActive: true },
            { memberId: member2._id, isActive: true },
          ]),
      }));
    }

    it('todaysSessions contains only sessions for members whose trainerId equals the requesting trainer', async () => {
      setupBaseState();

      const now = new Date();
      const startTime = '09:00';
      const endTime = '10:00';
      const todayDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        9,
        0,
        0,
      );

      // Session for trainer's member (member1)
      const sessionForMember1 = {
        _id: new Types.ObjectId(),
        trainerId,
        memberIds: [member1._id],
        date: todayDate,
        startTime,
        endTime,
        status: 'scheduled',
      };
      // Session for another trainer (should NOT appear)
      const sessionForOtherMember = {
        _id: new Types.ObjectId(),
        trainerId: otherTrainerId,
        memberIds: [member3._id],
        date: todayDate,
        startTime,
        endTime,
        status: 'scheduled',
      };

      // Return only the sessions for this trainer (backend scopes by trainerId in query)
      scheduledSessionModelMock.find.mockImplementation(
        (query: { trainerId?: Types.ObjectId }) => ({
          lean: () =>
            Promise.resolve(
              query.trainerId?.toString() === trainerId.toString()
                ? [sessionForMember1]
                : [sessionForOtherMember],
            ),
        }),
      );

      const result = await service.getTrainerDashboard(trainerId.toString());

      expect(result.todaysSessions.length).toBe(1);
      expect(result.todaysSessions[0].memberId).toBe(member1._id.toString());
    });

    it('needsAttention excludes members with a completed session in the last 7 days', async () => {
      setupBaseState();

      // member1 is active (recent session), member2 is idle (no recent session)
      sessionModelMock.countDocuments.mockImplementation(
        (query: {
          memberId?: Types.ObjectId;
          completedAt?: { $gte: Date };
        }) => {
          if (query.memberId && query.completedAt?.$gte) {
            if (query.memberId.toString() === member1._id.toString()) {
              return Promise.resolve(1); // member1 has a recent session
            }
            if (query.memberId.toString() === member2._id.toString()) {
              return Promise.resolve(0); // member2 is idle
            }
          }
          return Promise.resolve(0);
        },
      );

      const result = await service.getTrainerDashboard(trainerId.toString());

      // Only member2 should be in needsAttention with alertType 'idle'
      const idleAlerts = result.needsAttention.filter(
        (a) => a.alertType === 'idle',
      );
      expect(
        idleAlerts.some((a) => a.memberId === member2._id.toString()),
      ).toBe(true);
      expect(
        idleAlerts.some((a) => a.memberId === member1._id.toString()),
      ).toBe(false);
    });

    it('thisWeek has 7 entries Mon..Sun with exactly one isToday=true', async () => {
      setupBaseState();

      const result = await service.getTrainerDashboard(trainerId.toString());

      expect(result.thisWeek).toHaveLength(7);

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      result.thisWeek.forEach((entry, i) => {
        expect(entry.day).toBe(days[i]);
        expect(typeof entry.count).toBe('number');
        expect(typeof entry.isToday).toBe('boolean');
      });

      const todayEntries = result.thisWeek.filter((e) => e.isToday);
      expect(todayEntries).toHaveLength(1);
    });
  });
});
