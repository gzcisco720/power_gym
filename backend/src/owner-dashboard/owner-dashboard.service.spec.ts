import 'reflect-metadata';
import { OwnerDashboardService } from './owner-dashboard.service';
import type { IUser } from '../database/models/user.model';
import type { IEquipment } from '../database/models/equipment.model';
import type { IInviteToken } from '../database/models/invite-token.model';

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'user1' },
    firstName: 'Dev',
    lastName: 'Trainer',
    name: 'Dev Trainer',
    email: 'trainer@dev.com',
    role: 'trainer' as const,
    trainerId: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as IUser;
}

function makeEquipment(overrides: Partial<Record<string, unknown>> = {}): IEquipment {
  return {
    _id: { toString: () => 'equip1' },
    name: 'Barbell',
    status: 'active' as const,
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: false,
    nextServiceDate: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as IEquipment;
}

function makeInvite(overrides: Partial<IInviteToken> = {}): IInviteToken {
  const future = new Date(Date.now() + 86400000 * 7);
  return {
    token: 'tok',
    recipientEmail: 'x@x.com',
    role: 'member',
    invitedBy: { toString: () => 'owner1' } as never,
    trainerId: null,
    usedAt: null,
    expiresAt: future,
    ...overrides,
  } as unknown as IInviteToken;
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    inviteRepo?: Record<string, jest.Mock>;
    sessionRepo?: Record<string, jest.Mock>;
    equipmentRepo?: Record<string, jest.Mock>;
    checkInRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findByRole: jest.fn().mockResolvedValue([]),
    findAllMembers: jest.fn().mockResolvedValue([]),
    findMembersJoinedByMonth: jest.fn().mockResolvedValue([]),
  };
  const inviteRepo = overrides.inviteRepo ?? {
    findAll: jest.fn().mockResolvedValue([]),
  };
  const sessionRepo = overrides.sessionRepo ?? {
    countByMemberIdsSince: jest.fn().mockResolvedValue(0),
  };
  const equipmentRepo = overrides.equipmentRepo ?? {
    findAll: jest.fn().mockResolvedValue([]),
  };
  const checkInRepo = overrides.checkInRepo ?? {
    countSince: jest.fn().mockResolvedValue(0),
  };

  const service = new OwnerDashboardService(
    userRepo as never,
    inviteRepo as never,
    sessionRepo as never,
    equipmentRepo as never,
    checkInRepo as never,
  );
  return { service, userRepo, inviteRepo, sessionRepo, equipmentRepo, checkInRepo };
}

// ── getStats ──────────────────────────────────────────────────────────────────

describe('OwnerDashboardService > getStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns { trainerCount, memberCount, pendingInviteCount, sessionsThisMonth } counting only this-month sessions', async () => {
    const trainer = makeUser({ role: 'trainer' });
    const member1 = makeUser({ _id: { toString: () => 'mem1' }, role: 'member' });
    const member2 = makeUser({ _id: { toString: () => 'mem2' }, role: 'member' });
    const pendingInvite = makeInvite();

    const { service, sessionRepo } = makeService({
      userRepo: {
        findByRole: jest.fn().mockResolvedValue([trainer]),
        findAllMembers: jest.fn().mockResolvedValue([member1, member2]),
        findMembersJoinedByMonth: jest.fn().mockResolvedValue([{ newCount: 2 }]),
      },
      inviteRepo: {
        findAll: jest.fn().mockResolvedValue([pendingInvite]),
      },
      sessionRepo: {
        countByMemberIdsSince: jest.fn().mockResolvedValue(7),
      },
      checkInRepo: {
        countSince: jest.fn().mockResolvedValue(5),
      },
    });

    const result = await service.getStats();

    expect(result.trainerCount).toBe(1);
    expect(result.memberCount).toBe(2);
    expect(result.pendingInviteCount).toBe(1);
    expect(result.sessionsThisMonth).toBe(7);
    // sessions counted 3× (thisMonth, lastMonth, today)
    expect(sessionRepo.countByMemberIdsSince).toHaveBeenCalledTimes(3);
    const [memberIds, since] = sessionRepo.countByMemberIdsSince.mock.calls[0] as [string[], Date];
    expect(memberIds).toEqual(['mem1', 'mem2']);
    const now = new Date();
    expect(since.getFullYear()).toBe(now.getFullYear());
    expect(since.getMonth()).toBe(now.getMonth());
    expect(since.getDate()).toBe(1);
  });

  it('returns sessionsToday and check-in counts', async () => {
    const { service } = makeService({
      userRepo: {
        findByRole: jest.fn().mockResolvedValue([makeUser()]),
        findAllMembers: jest.fn().mockResolvedValue([]),
        findMembersJoinedByMonth: jest.fn().mockResolvedValue([]),
      },
      inviteRepo: { findAll: jest.fn().mockResolvedValue([]) },
      sessionRepo: { countByMemberIdsSince: jest.fn().mockResolvedValue(3) },
      checkInRepo: { countSince: jest.fn().mockResolvedValue(10) },
    });

    const result = await service.getStats();

    expect(typeof result.sessionsToday).toBe('number');
    expect(typeof result.checkInsThisWeek).toBe('number');
    expect(typeof result.checkInsLastWeek).toBe('number');
  });
});

// ── getTrainerBreakdown ────────────────────────────────────────────────────────

describe('OwnerDashboardService > getTrainerBreakdown', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns one row per trainer with assigned member count', async () => {
    const trainer1 = makeUser({ _id: { toString: () => 't1' }, name: 'Alice T', email: 'alice@t.com' });
    const trainer2 = makeUser({ _id: { toString: () => 't2' }, name: 'Bob T', email: 'bob@t.com' });
    const member1 = makeUser({ _id: { toString: () => 'm1' }, role: 'member' });

    const findByRole = jest.fn().mockResolvedValue([trainer1, trainer2]);
    const findAllMembers = jest
      .fn()
      .mockResolvedValueOnce([member1])
      .mockResolvedValueOnce([]);
    const countByMemberIdsSince = jest
      .fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0);

    const { service } = makeService({
      userRepo: { findByRole, findAllMembers, findMembersJoinedByMonth: jest.fn().mockResolvedValue([]) },
      sessionRepo: { countByMemberIdsSince },
    });

    const result = await service.getTrainerBreakdown();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ _id: 't1', name: 'Alice T', memberCount: 1, sessionsThisMonth: 4 });
    expect(result[1]).toMatchObject({ _id: 't2', name: 'Bob T', memberCount: 0, sessionsThisMonth: 0 });
  });
});

// ── getEquipmentStatus ────────────────────────────────────────────────────────

describe('OwnerDashboardService > getEquipmentStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('groups equipment by status (active/maintenance/retired) with counts', async () => {
    const active = makeEquipment({ status: 'active' });
    const maintenance = makeEquipment({ _id: { toString: () => 'eq2' }, name: 'Treadmill', status: 'maintenance' });
    const retired = makeEquipment({ _id: { toString: () => 'eq3' }, name: 'Old bike', status: 'retired' });

    const { service } = makeService({
      equipmentRepo: { findAll: jest.fn().mockResolvedValue([active, maintenance, retired]) },
    });

    const result = await service.getEquipmentStatus();

    expect(result.active).toBe(1);
    expect(result.maintenance).toBe(1);
    expect(result.retired).toBe(1);
    expect(typeof result.overdue).toBe('number');
    expect(Array.isArray(result.items)).toBe(true);
  });
});
