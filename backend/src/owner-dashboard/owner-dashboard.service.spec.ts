import 'reflect-metadata';
import { OwnerDashboardService } from './owner-dashboard.service';
import type { IUser } from '../database/models/user.model';
import type { IEquipment } from '../database/models/equipment.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function makeEquipment(
  overrides: Partial<Record<string, unknown>> = {},
): IEquipment {
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

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    inviteRepo?: Record<string, jest.Mock>;
    sessionRepo?: Record<string, jest.Mock>;
    equipmentRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findByRole: jest.fn().mockResolvedValue([]),
    findAllMembers: jest.fn().mockResolvedValue([]),
  };
  const inviteRepo = overrides.inviteRepo ?? {
    countPending: jest.fn().mockResolvedValue(0),
  };
  const sessionRepo = overrides.sessionRepo ?? {
    countByMemberIdsSince: jest.fn().mockResolvedValue(0),
  };
  const equipmentRepo = overrides.equipmentRepo ?? {
    findAll: jest.fn().mockResolvedValue([]),
  };

  const service = new OwnerDashboardService(
    userRepo as never,
    inviteRepo as never,
    sessionRepo as never,
    equipmentRepo as never,
  );
  return { service, userRepo, inviteRepo, sessionRepo, equipmentRepo };
}

// ── getStats ──────────────────────────────────────────────────────────────────

describe('OwnerDashboardService > getStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns { trainerCount, memberCount, pendingInviteCount, sessionsThisMonth } counting only this-month sessions', async () => {
    const trainer = makeUser({ role: 'trainer' });
    const member1 = makeUser({
      _id: { toString: () => 'mem1' },
      role: 'member',
    });
    const member2 = makeUser({
      _id: { toString: () => 'mem2' },
      role: 'member',
    });

    const { service, userRepo, inviteRepo, sessionRepo } = makeService({
      userRepo: {
        findByRole: jest.fn().mockResolvedValue([trainer]),
        findAllMembers: jest.fn().mockResolvedValue([member1, member2]),
      },
      inviteRepo: {
        countPending: jest.fn().mockResolvedValue(3),
      },
      sessionRepo: {
        countByMemberIdsSince: jest.fn().mockResolvedValue(7),
      },
    });

    const result = await service.getStats();

    expect(result).toEqual({
      trainerCount: 1,
      memberCount: 2,
      pendingInviteCount: 3,
      sessionsThisMonth: 7,
    });
    // sessions are counted from start of current month
    expect(sessionRepo.countByMemberIdsSince).toHaveBeenCalledTimes(1);
    const [memberIds, since] = sessionRepo.countByMemberIdsSince.mock
      .calls[0] as [string[], Date];
    expect(memberIds).toEqual(['mem1', 'mem2']);
    const now = new Date();
    expect(since.getFullYear()).toBe(now.getFullYear());
    expect(since.getMonth()).toBe(now.getMonth());
    expect(since.getDate()).toBe(1);
    void userRepo;
    void inviteRepo;
  });
});

// ── getTrainerBreakdown ────────────────────────────────────────────────────────

describe('OwnerDashboardService > getTrainerBreakdown', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns one row per trainer with assigned member count', async () => {
    const trainer1 = makeUser({
      _id: { toString: () => 't1' },
      name: 'Alice T',
      email: 'alice@t.com',
    });
    const trainer2 = makeUser({
      _id: { toString: () => 't2' },
      name: 'Bob T',
      email: 'bob@t.com',
    });
    const member1 = makeUser({ _id: { toString: () => 'm1' }, role: 'member' });

    const findByRole = jest.fn().mockResolvedValue([trainer1, trainer2]);
    const findAllMembers = jest
      .fn()
      .mockResolvedValueOnce([member1]) // for trainer1
      .mockResolvedValueOnce([]); // for trainer2
    const countByMemberIdsSince = jest
      .fn()
      .mockResolvedValueOnce(4) // trainer1 sessions
      .mockResolvedValueOnce(0); // trainer2 sessions

    const { service } = makeService({
      userRepo: { findByRole, findAllMembers },
      sessionRepo: { countByMemberIdsSince },
    });

    const result = await service.getTrainerBreakdown();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      _id: 't1',
      name: 'Alice T',
      email: 'alice@t.com',
      memberCount: 1,
      sessionsThisMonth: 4,
    });
    expect(result[1]).toMatchObject({
      _id: 't2',
      name: 'Bob T',
      email: 'bob@t.com',
      memberCount: 0,
      sessionsThisMonth: 0,
    });
  });
});

// ── getEquipmentStatus ────────────────────────────────────────────────────────

describe('OwnerDashboardService > getEquipmentStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('groups equipment by status (active/maintenance/retired) with counts', async () => {
    const activeItem = makeEquipment({ status: 'active' });
    const maintenanceItem = makeEquipment({
      _id: { toString: () => 'equip2' },
      name: 'Treadmill',
      status: 'maintenance',
    });
    const retiredItem = makeEquipment({
      _id: { toString: () => 'equip3' },
      name: 'Old bike',
      status: 'retired',
    });

    const { service, equipmentRepo } = makeService({
      equipmentRepo: {
        findAll: jest
          .fn()
          .mockResolvedValue([activeItem, maintenanceItem, retiredItem]),
      },
    });

    const result = await service.getEquipmentStatus();

    expect(result.active).toBe(1);
    expect(result.maintenance).toBe(1);
    expect(result.retired).toBe(1);
    expect(typeof result.overdue).toBe('number');
    expect(Array.isArray(result.items)).toBe(true);
    void equipmentRepo;
  });

  it('counts overdue items (nextServiceDate in the past)', async () => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    const overdueItem = makeEquipment({
      status: 'active',
      nextServiceDate: pastDate,
    });
    const upToDate = makeEquipment({
      _id: { toString: () => 'equip2' },
      status: 'active',
    });

    const { service } = makeService({
      equipmentRepo: {
        findAll: jest.fn().mockResolvedValue([overdueItem, upToDate]),
      },
    });

    const result = await service.getEquipmentStatus();

    expect(result.overdue).toBe(1);
  });
});
