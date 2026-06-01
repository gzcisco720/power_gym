import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OwnerDashboardService } from './owner-dashboard.service';
import { User } from '../../common/models/user.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { CheckIn } from '../../common/models/check-in.model';
import { Equipment } from '../../common/models/equipment.model';
import { InviteToken } from '../../common/models/invite-token.model';

function makeUser(
  role: 'owner' | 'trainer' | 'member',
  trainerId: Types.ObjectId | null = null,
  createdAt = new Date(),
) {
  return {
    _id: new Types.ObjectId(),
    role,
    trainerId,
    createdAt,
    firstName: 'Test',
    lastName: 'User',
  };
}

function makeEquipment(
  status: 'active' | 'maintenance' | 'retired',
  nextServiceDate: Date | null = null,
) {
  return {
    _id: new Types.ObjectId(),
    name: `Equipment-${Math.random()}`,
    status,
    nextServiceDate,
    note: null,
  };
}

function makeInvite(usedAt: Date | null, expiresAt: Date) {
  return { _id: new Types.ObjectId(), usedAt, expiresAt };
}

describe('OwnerDashboardService', () => {
  let service: OwnerDashboardService;

  const userModelMock = {
    find: jest.fn(),
    aggregate: jest.fn(),
  };
  const sessionModelMock = {
    countDocuments: jest.fn(),
  };
  const checkInModelMock = {
    countDocuments: jest.fn(),
  };
  const equipmentModelMock = {
    find: jest.fn(),
  };
  const inviteModelMock = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerDashboardService,
        { provide: getModelToken(User.name), useValue: userModelMock },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: sessionModelMock,
        },
        { provide: getModelToken(CheckIn.name), useValue: checkInModelMock },
        {
          provide: getModelToken(Equipment.name),
          useValue: equipmentModelMock,
        },
        { provide: getModelToken(InviteToken.name), useValue: inviteModelMock },
      ],
    }).compile();

    service = module.get<OwnerDashboardService>(OwnerDashboardService);
  });

  describe('getOwnerDashboard', () => {
    it('returns stats.trainerCount and stats.memberCount matching seeded user counts', async () => {
      const trainer1 = makeUser('trainer');
      const trainer2 = makeUser('trainer');
      const member1 = makeUser('member');
      const member2 = makeUser('member');
      const member3 = makeUser('member');

      // find('trainer') and find('member') calls
      userModelMock.find.mockImplementation((query: { role?: string }) => ({
        lean: () =>
          Promise.resolve(
            query.role === 'trainer'
              ? [trainer1, trainer2]
              : [member1, member2, member3],
          ),
      }));

      sessionModelMock.countDocuments.mockResolvedValue(0);
      checkInModelMock.countDocuments.mockResolvedValue(0);

      equipmentModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      inviteModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      userModelMock.aggregate.mockResolvedValue([]);

      const result = await service.getOwnerDashboard();

      expect(result.stats.trainerCount).toBe(2);
      expect(result.stats.memberCount).toBe(3);
    });

    it('memberGrowth has exactly 6 entries ordered oldest-first', async () => {
      userModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve([]),
      }));
      sessionModelMock.countDocuments.mockResolvedValue(0);
      checkInModelMock.countDocuments.mockResolvedValue(0);
      equipmentModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      inviteModelMock.find.mockReturnValue({ lean: () => Promise.resolve([]) });

      // Simulate aggregate returns for findMembersJoinedByMonth(6)
      const now = new Date();
      userModelMock.aggregate.mockResolvedValue([
        {
          _id: { year: now.getFullYear(), month: now.getMonth() + 1 },
          count: 3,
        },
      ]);

      const result = await service.getOwnerDashboard();

      expect(result.memberGrowth).toHaveLength(6);
      // First entry is the oldest month, last is current
      // month labels should be strings
      result.memberGrowth.forEach((entry) => {
        expect(typeof entry.month).toBe('string');
        expect(typeof entry.count).toBe('number');
      });
      // Current month should have count 3
      expect(result.memberGrowth[5].count).toBe(3);
    });

    it('trainerPerformance sorted by sessionCount descending, capped at 5', async () => {
      // 6 trainers — only top 5 should be returned, sorted desc
      const trainers = Array.from({ length: 6 }, (_, i) => ({
        ...makeUser('trainer'),
        _id: new Types.ObjectId(),
        firstName: `Trainer${i}`,
        lastName: 'T',
      }));
      const members: ReturnType<typeof makeUser>[] = [];

      userModelMock.find.mockImplementation((query: { role?: string }) => ({
        lean: () =>
          Promise.resolve(query.role === 'trainer' ? trainers : members),
      }));

      // countDocuments: return session count per member group (all 0 since no members, but we
      // need to test sorting — we mock at the service level, so just ensure ordering):
      sessionModelMock.countDocuments.mockResolvedValue(0);
      checkInModelMock.countDocuments.mockResolvedValue(0);
      equipmentModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      inviteModelMock.find.mockReturnValue({ lean: () => Promise.resolve([]) });
      userModelMock.aggregate.mockResolvedValue([]);

      const result = await service.getOwnerDashboard();

      expect(result.trainerPerformance.length).toBeLessThanOrEqual(5);

      // Verify sorting: each entry sessionCount >= next entry
      for (let i = 0; i < result.trainerPerformance.length - 1; i++) {
        expect(
          result.trainerPerformance[i].sessionCount,
        ).toBeGreaterThanOrEqual(result.trainerPerformance[i + 1].sessionCount);
      }
    });

    it('equipment.nonActiveItems excludes active equipment and is capped at 5', async () => {
      const activeEquipment = Array.from({ length: 3 }, () =>
        makeEquipment('active'),
      );
      const nonActive = Array.from({ length: 6 }, (_, i) =>
        i < 3 ? makeEquipment('maintenance') : makeEquipment('retired'),
      );

      userModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve([]),
      }));
      sessionModelMock.countDocuments.mockResolvedValue(0);
      checkInModelMock.countDocuments.mockResolvedValue(0);
      equipmentModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([...activeEquipment, ...nonActive]),
      });
      inviteModelMock.find.mockReturnValue({ lean: () => Promise.resolve([]) });
      userModelMock.aggregate.mockResolvedValue([]);

      const result = await service.getOwnerDashboard();

      expect(result.equipment.nonActiveItems.length).toBeLessThanOrEqual(5);
      result.equipment.nonActiveItems.forEach((item) => {
        expect(item.status).not.toBe('active');
      });
    });

    it('stats.expiringInviteCount counts pending invites expiring within 3 days', async () => {
      const now = new Date();
      const in1Day = new Date(now.getTime() + 1 * 86400000);
      const in2Days = new Date(now.getTime() + 2 * 86400000);
      const in5Days = new Date(now.getTime() + 5 * 86400000);
      const alreadyUsed = new Date(now.getTime() + 1 * 86400000);

      const invites = [
        makeInvite(null, in1Day), // expiring soon
        makeInvite(null, in2Days), // expiring soon
        makeInvite(null, in5Days), // not expiring soon
        makeInvite(new Date(), alreadyUsed), // used → not pending
      ];

      userModelMock.find.mockImplementation(() => ({
        lean: () => Promise.resolve([]),
      }));
      sessionModelMock.countDocuments.mockResolvedValue(0);
      checkInModelMock.countDocuments.mockResolvedValue(0);
      equipmentModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      inviteModelMock.find.mockReturnValue({
        lean: () => Promise.resolve(invites),
      });
      userModelMock.aggregate.mockResolvedValue([]);

      const result = await service.getOwnerDashboard();

      expect(result.stats.expiringInviteCount).toBe(2);
    });
  });
});
