import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BillingService } from './billing.service';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { ServiceType } from '../../common/models/service-type.model';
import { User } from '../../common/models/user.model';

function makeSession(overrides: {
  memberId?: Types.ObjectId;
  trainerId?: Types.ObjectId;
  serviceTypeId?: Types.ObjectId | null;
  status?: 'scheduled' | 'cancelled';
  date?: Date;
  startTime?: string;
  endTime?: string;
}): {
  _id: Types.ObjectId;
  memberIds: Types.ObjectId[];
  trainerId: Types.ObjectId;
  serviceTypeId: Types.ObjectId | null;
  status: 'scheduled' | 'cancelled';
  date: Date;
  startTime: string;
  endTime: string;
} {
  return {
    _id: new Types.ObjectId(),
    memberIds: overrides.memberId ? [overrides.memberId] : [],
    trainerId: overrides.trainerId ?? new Types.ObjectId(),
    serviceTypeId:
      overrides.serviceTypeId !== undefined
        ? overrides.serviceTypeId
        : new Types.ObjectId(),
    status: overrides.status ?? 'scheduled',
    date: overrides.date ?? new Date(Date.now() - 86400000),
    startTime: overrides.startTime ?? '09:00',
    endTime: overrides.endTime ?? '10:00',
  };
}

function makeServiceType(overrides?: {
  pricePerSession?: number;
  currency?: string;
  name?: string;
}): {
  _id: Types.ObjectId;
  name: string;
  pricePerSession: number;
  currency: string;
} {
  return {
    _id: new Types.ObjectId(),
    name: overrides?.name ?? 'Standard Session',
    pricePerSession: overrides?.pricePerSession ?? 100,
    currency: overrides?.currency ?? 'AUD',
  };
}

function makeUser(
  id: Types.ObjectId,
  overrides?: {
    trainerId?: Types.ObjectId | null;
    role?: 'owner' | 'trainer' | 'member';
    firstName?: string;
    lastName?: string;
  },
): {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  role: 'owner' | 'trainer' | 'member';
  trainerId: Types.ObjectId | null;
} {
  return {
    _id: id,
    firstName: overrides?.firstName ?? 'Test',
    lastName: overrides?.lastName ?? 'User',
    role: overrides?.role ?? 'member',
    trainerId: overrides?.trainerId ?? null,
  };
}

describe('BillingService', () => {
  let service: BillingService;

  const scheduledSessionModelMock = { find: jest.fn() };
  const serviceTypeModelMock = { find: jest.fn() };
  const userModelMock = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getModelToken(ScheduledSession.name),
          useValue: scheduledSessionModelMock,
        },
        {
          provide: getModelToken(ServiceType.name),
          useValue: serviceTypeModelMock,
        },
        { provide: getModelToken(User.name), useValue: userModelMock },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('getMyBilling', () => {
    it('returns one line per billable session with price from its service type and a total equal to the sum of line prices', async () => {
      const memberId = new Types.ObjectId();
      const st1 = makeServiceType({
        pricePerSession: 80,
        currency: 'AUD',
        name: 'PT Session',
      });
      const st2 = makeServiceType({
        pricePerSession: 60,
        currency: 'AUD',
        name: 'Group Class',
      });

      const s1 = makeSession({
        memberId,
        serviceTypeId: st1._id,
        date: new Date(Date.now() - 86400000),
      });
      const s2 = makeSession({
        memberId,
        serviceTypeId: st2._id,
        date: new Date(Date.now() - 172800000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([s1, s2]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st1, st2]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getMyBilling(memberId.toString(), from, to);

      expect(result.lines).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.total).toBe(140);
      expect(result.currency).toBe('AUD');
      const line1 = result.lines.find(
        (l) => l.serviceTypeName === 'PT Session',
      );
      expect(line1?.price).toBe(80);
    });

    it('excludes cancelled sessions, sessions with null serviceTypeId, and sessions whose date is >= now', async () => {
      const memberId = new Types.ObjectId();
      const st = makeServiceType({ pricePerSession: 100 });

      const cancelled = makeSession({
        memberId,
        serviceTypeId: st._id,
        status: 'cancelled',
        date: new Date(Date.now() - 86400000),
      });
      const noServiceType = makeSession({
        memberId,
        serviceTypeId: null,
        date: new Date(Date.now() - 86400000),
      });
      const future = makeSession({
        memberId,
        serviceTypeId: st._id,
        date: new Date(Date.now() + 86400000),
      });
      const valid = makeSession({
        memberId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([cancelled, noServiceType, future, valid]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 2 * 86400000).toISOString();

      const result = await service.getMyBilling(memberId.toString(), from, to);

      expect(result.count).toBe(1);
      expect(result.total).toBe(100);
    });

    it('returns total 0, count 0, empty lines, and currency AUD when no billable sessions exist', async () => {
      const memberId = new Types.ObjectId();

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getMyBilling(memberId.toString(), from, to);

      expect(result.total).toBe(0);
      expect(result.count).toBe(0);
      expect(result.lines).toHaveLength(0);
      expect(result.currency).toBe('AUD');
    });
  });

  describe('getMemberBilling', () => {
    it('returns total, count, currency, and lines for the member completed billable sessions in the period', async () => {
      const memberId = new Types.ObjectId();
      const trainerId = new Types.ObjectId();
      const st = makeServiceType({ pricePerSession: 80, currency: 'AUD' });
      const session = makeSession({
        memberId,
        trainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([session]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st]),
      });
      userModelMock.find.mockReturnValue({
        lean: () =>
          Promise.resolve([makeUser(memberId, { trainerId, role: 'member' })]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getMemberBilling(
        memberId.toString(),
        trainerId.toString(),
        'trainer',
        from,
        to,
      );

      expect(result.count).toBe(1);
      expect(result.total).toBe(80);
      expect(result.currency).toBe('AUD');
      expect(result.lines).toHaveLength(1);
    });

    it('throws NotFoundException when a trainer requests a member not assigned to them', async () => {
      const memberId = new Types.ObjectId();
      const trainerId = new Types.ObjectId();
      const otherTrainerId = new Types.ObjectId();

      userModelMock.find.mockReturnValue({
        lean: () =>
          Promise.resolve([
            makeUser(memberId, { trainerId: otherTrainerId, role: 'member' }),
          ]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      await expect(
        service.getMemberBilling(
          memberId.toString(),
          trainerId.toString(),
          'trainer',
          from,
          to,
        ),
      ).rejects.toThrow('Not Found');
    });

    it('allows an owner to fetch any member billing without scoping check', async () => {
      const memberId = new Types.ObjectId();
      const ownerId = new Types.ObjectId();
      const st = makeServiceType({ pricePerSession: 100 });
      const session = makeSession({
        memberId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([session]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getMemberBilling(
        memberId.toString(),
        ownerId.toString(),
        'owner',
        from,
        to,
      );

      expect(result.count).toBe(1);
      expect(result.memberId).toBe(memberId.toString());
    });
  });

  describe('getSummary', () => {
    it('groups sessions by member returning sessionsCount and totalAmount per member plus a grandTotal equal to the sum of member totals', async () => {
      const member1Id = new Types.ObjectId();
      const member2Id = new Types.ObjectId();
      const trainerId = new Types.ObjectId();

      const st = makeServiceType({ pricePerSession: 100, currency: 'AUD' });

      const s1 = makeSession({
        memberId: member1Id,
        trainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });
      const s2 = makeSession({
        memberId: member1Id,
        trainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 172800000),
      });
      const s3 = makeSession({
        memberId: member2Id,
        trainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([s1, s2, s3]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st]),
      });

      const member1 = makeUser(member1Id, {
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const member2 = makeUser(member2Id, {
        firstName: 'Bob',
        lastName: 'Jones',
      });
      const trainerUser = makeUser(trainerId, {
        role: 'trainer',
        firstName: 'Trainer',
        lastName: 'T',
      });

      userModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([member1, member2, trainerUser]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getSummary('owner', 'ignored', from, to);

      expect(result.members).toHaveLength(2);
      expect(result.grandTotal).toBe(300);
      expect(result.currency).toBe('AUD');

      const alice = result.members.find((m) => m.name === 'Alice Smith');
      expect(alice?.sessionsCount).toBe(2);
      expect(alice?.totalAmount).toBe(200);

      const bob = result.members.find((m) => m.name === 'Bob Jones');
      expect(bob?.sessionsCount).toBe(1);
      expect(bob?.totalAmount).toBe(100);
    });

    it('when role is trainer, only includes sessions whose trainerId equals the requesting trainer id', async () => {
      const memberId = new Types.ObjectId();
      const trainerId = new Types.ObjectId();
      const otherTrainerId = new Types.ObjectId();

      const st = makeServiceType({ pricePerSession: 100 });

      const ownSession = makeSession({
        memberId,
        trainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });
      const otherSession = makeSession({
        memberId,
        trainerId: otherTrainerId,
        serviceTypeId: st._id,
        date: new Date(Date.now() - 86400000),
      });

      scheduledSessionModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([ownSession, otherSession]),
      });
      serviceTypeModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([st]),
      });

      const memberUser = makeUser(memberId, {
        firstName: 'Alice',
        lastName: 'Smith',
      });
      const trainerUser = makeUser(trainerId, {
        role: 'trainer',
        firstName: 'Trainer',
        lastName: 'T',
      });

      userModelMock.find.mockReturnValue({
        lean: () => Promise.resolve([memberUser, trainerUser]),
      });

      const from = new Date(Date.now() - 7 * 86400000).toISOString();
      const to = new Date(Date.now() + 86400000).toISOString();

      const result = await service.getSummary(
        'trainer',
        trainerId.toString(),
        from,
        to,
      );

      // Only the trainer's own session should count
      expect(result.grandTotal).toBe(100);
      const alice = result.members.find((m) => m.name === 'Alice Smith');
      expect(alice?.sessionsCount).toBe(1);
    });
  });
});
