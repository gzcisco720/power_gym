import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { OwnerPeopleService } from './owner-people.service';
import type { IUser } from '../database/models/user.model';
import type { IPlanTemplate } from '../database/models/plan-template.model';

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'user1' },
    firstName: 'Dev',
    lastName: 'Trainer',
    name: 'Dev Trainer',
    email: 'trainer@dev.com',
    role: 'trainer' as const,
    trainerId: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as unknown as IUser;
}

function makePlanTemplate(
  overrides: Partial<Record<string, unknown>> = {},
): IPlanTemplate {
  return {
    _id: { toString: () => 'plan1' },
    name: 'Strength Block',
    description: null,
    createdBy: { toString: () => 'user1' },
    days: [],
    createdAt: new Date(),
    ...overrides,
  } as unknown as IPlanTemplate;
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    sessionRepo?: Record<string, jest.Mock>;
    planTemplateRepo?: Record<string, jest.Mock>;
    nutritionTemplateRepo?: Record<string, jest.Mock>;
    scheduledSessionRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findByRole: jest.fn().mockResolvedValue([]),
    findAllMembers: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    updateTrainerId: jest.fn().mockResolvedValue(undefined),
  };
  const sessionRepo = overrides.sessionRepo ?? {
    countByMemberIdsSince: jest.fn().mockResolvedValue(0),
  };
  const planTemplateRepo = overrides.planTemplateRepo ?? {
    findByCreator: jest.fn().mockResolvedValue([]),
  };
  const nutritionTemplateRepo = overrides.nutritionTemplateRepo ?? {
    findByCreator: jest.fn().mockResolvedValue([]),
  };
  const scheduledSessionRepo = overrides.scheduledSessionRepo ?? {
    findByMember: jest.fn().mockResolvedValue([]),
  };

  const service = new OwnerPeopleService(
    userRepo as never,
    sessionRepo as never,
    planTemplateRepo as never,
    nutritionTemplateRepo as never,
    scheduledSessionRepo as never,
  );
  return {
    service,
    userRepo,
    sessionRepo,
    planTemplateRepo,
    nutritionTemplateRepo,
    scheduledSessionRepo,
  };
}

// ── OwnerTrainersService > list ──────────────────────────────────────────────

describe('OwnerPeopleService > list trainers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns trainers with assigned-member counts', async () => {
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
    const member1 = makeUser({
      _id: { toString: () => 'm1' },
      role: 'member',
    });

    const findByRole = jest.fn().mockResolvedValue([trainer1, trainer2]);
    const findAllMembers = jest
      .fn()
      .mockResolvedValueOnce([member1])
      .mockResolvedValueOnce([]);
    const countByMemberIdsSince = jest
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    const { service } = makeService({
      userRepo: {
        findByRole,
        findAllMembers,
        findById: jest.fn(),
        updateTrainerId: jest.fn(),
      },
      sessionRepo: { countByMemberIdsSince },
    });

    const result = await service.listTrainers();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      _id: 't1',
      name: 'Alice T',
      email: 'alice@t.com',
      memberCount: 1,
      sessionsThisMonth: 3,
    });
    expect(result[1]).toMatchObject({
      _id: 't2',
      name: 'Bob T',
      memberCount: 0,
      sessionsThisMonth: 0,
    });
  });
});

// ── OwnerTrainersService > getById ────────────────────────────────────────────

describe('OwnerPeopleService > get trainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns trainer profile + stats consumed by the detail hub', async () => {
    const trainer = makeUser({ _id: { toString: () => 'tid1' } });
    const member = makeUser({
      _id: { toString: () => 'mid1' },
      role: 'member',
    });
    const plan = makePlanTemplate();

    const { service } = makeService({
      userRepo: {
        findById: jest.fn().mockResolvedValue(trainer),
        findAllMembers: jest.fn().mockResolvedValue([member]),
        updateTrainerId: jest.fn(),
        findByRole: jest.fn(),
      },
      sessionRepo: {
        countByMemberIdsSince: jest.fn().mockResolvedValue(5),
      },
      planTemplateRepo: {
        findByCreator: jest.fn().mockResolvedValue([plan]),
      },
    });

    const result = await service.getTrainerById('tid1');

    expect(result._id).toBe('tid1');
    expect(result.name).toBe('Dev Trainer');
    expect(result.memberCount).toBe(1);
    expect(result.sessionsThisMonth).toBe(5);
    expect(result.templateCount).toBe(1);
  });

  it('throws NotFoundException when trainer not found', async () => {
    const { service } = makeService({
      userRepo: {
        findById: jest.fn().mockResolvedValue(null),
        findAllMembers: jest.fn(),
        updateTrainerId: jest.fn(),
        findByRole: jest.fn(),
      },
    });

    await expect(service.getTrainerById('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── OwnerMembersService > reassignTrainer ─────────────────────────────────────

describe('OwnerPeopleService > reassign trainer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates member.trainerId', async () => {
    const member = makeUser({
      _id: { toString: () => 'mem1' },
      role: 'member',
      trainerId: { toString: () => 'old-trainer' },
    });

    const updateTrainerId = jest.fn().mockResolvedValue(undefined);
    const findById = jest.fn().mockResolvedValue(member);

    const { service } = makeService({
      userRepo: {
        findById,
        findAllMembers: jest.fn(),
        findByRole: jest.fn(),
        updateTrainerId,
      },
    });

    await service.reassignTrainer('mem1', 'new-trainer-id');

    expect(updateTrainerId).toHaveBeenCalledWith('mem1', 'new-trainer-id');
  });

  it('rejects non-existent member with 404', async () => {
    const { service } = makeService({
      userRepo: {
        findById: jest.fn().mockResolvedValue(null),
        findAllMembers: jest.fn(),
        findByRole: jest.fn(),
        updateTrainerId: jest.fn(),
      },
    });

    await expect(
      service.reassignTrainer('bad-id', 'trainer-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects non-member user with 404', async () => {
    const trainer = makeUser({ role: 'trainer' });
    const { service } = makeService({
      userRepo: {
        findById: jest.fn().mockResolvedValue(trainer),
        findAllMembers: jest.fn(),
        findByRole: jest.fn(),
        updateTrainerId: jest.fn(),
      },
    });

    await expect(
      service.reassignTrainer('trainer-id', 'other-id'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── OwnerMembersService > listMembers ─────────────────────────────────────────

describe('OwnerPeopleService > list members', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns members with trainer name', async () => {
    const trainer = makeUser({
      _id: { toString: () => 'tid1' },
      name: 'Dev Trainer',
      role: 'trainer',
    });
    const member = makeUser({
      _id: { toString: () => 'mid1' },
      name: 'John Member',
      email: 'john@test.com',
      role: 'member',
      trainerId: { toString: () => 'tid1' },
    });

    const { service } = makeService({
      userRepo: {
        findAllMembers: jest.fn().mockResolvedValue([member]),
        findById: jest.fn().mockResolvedValue(trainer),
        findByRole: jest.fn(),
        updateTrainerId: jest.fn(),
      },
    });

    const result = await service.listMembers();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      _id: 'mid1',
      name: 'John Member',
      email: 'john@test.com',
      trainerId: 'tid1',
    });
  });
});
