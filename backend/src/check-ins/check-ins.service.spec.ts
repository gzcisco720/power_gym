import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { ICheckIn } from '../database/models/check-in.model';
import type { ICheckInConfig } from '../database/models/check-in-config.model';
import type { IUser } from '../database/models/user.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'member1' },
    trainerId: { toString: () => 'trainer1' },
    role: 'member' as const,
    ...overrides,
  } as unknown as IUser;
}

function makeCheckIn(): ICheckIn {
  return { _id: 'ci1', memberId: 'member1' } as unknown as ICheckIn;
}

function makeConfig(): ICheckInConfig {
  return { _id: 'cfg1', memberId: 'member1' } as unknown as ICheckInConfig;
}

function makeService(
  overrides: {
    checkInRepo?: Record<string, jest.Mock>;
    checkInConfigRepo?: Record<string, jest.Mock>;
    userRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const checkInRepo = overrides.checkInRepo ?? {
    create: jest.fn().mockResolvedValue(makeCheckIn()),
    existsForDay: jest.fn().mockResolvedValue(false),
    findByMember: jest.fn().mockResolvedValue([makeCheckIn()]),
  };
  const checkInConfigRepo = overrides.checkInConfigRepo ?? {
    upsert: jest.fn().mockResolvedValue(makeConfig()),
  };
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(makeUser()),
  };

  const service = new CheckInsService(
    checkInRepo as never,
    checkInConfigRepo as never,
    userRepo as never,
  );

  return { service, checkInRepo, checkInConfigRepo, userRepo };
}

const memberCaller: AuthUser = {
  userId: 'member1',
  email: 'm@x.com',
  role: 'member',
};
const trainerCaller: AuthUser = {
  userId: 'trainer1',
  email: 't@x.com',
  role: 'trainer',
};

const baseDto = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 8,
  stuckToDiet: 'yes' as const,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe('CheckInsService > create', () => {
  it('throws NotFoundException when the calling member is not found', async () => {
    const { service } = makeService({
      userRepo: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.create(memberCaller, baseDto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when a check-in already exists for today', async () => {
    const { service } = makeService({
      checkInRepo: {
        create: jest.fn().mockResolvedValue(makeCheckIn()),
        existsForDay: jest.fn().mockResolvedValue(true),
        findByMember: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(service.create(memberCaller, baseDto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('falls back trainerId to caller.userId when the member has no trainer', async () => {
    const memberWithoutTrainer = makeUser({ trainerId: undefined });
    const checkInRepo = {
      create: jest.fn().mockResolvedValue(makeCheckIn()),
      existsForDay: jest.fn().mockResolvedValue(false),
      findByMember: jest.fn().mockResolvedValue([]),
    };
    const { service } = makeService({
      userRepo: { findById: jest.fn().mockResolvedValue(memberWithoutTrainer) },
      checkInRepo,
    });

    await service.create(memberCaller, baseDto);

    expect(checkInRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: memberCaller.userId }),
    );
  });

  describe('with fake timers', () => {
    afterEach(() => jest.useRealTimers());

    it('computes the existsForDay window as UTC midnight to +24h', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-29T15:00:00Z'));

      const checkInRepo = {
        create: jest.fn().mockResolvedValue(makeCheckIn()),
        existsForDay: jest.fn().mockResolvedValue(false),
        findByMember: jest.fn().mockResolvedValue([]),
      };
      const { service } = makeService({ checkInRepo });

      await service.create(memberCaller, baseDto);

      expect(checkInRepo.existsForDay).toHaveBeenCalledWith(
        memberCaller.userId,
        new Date('2026-05-29T00:00:00.000Z'),
        new Date('2026-05-30T00:00:00.000Z'),
      );
    });
  });
});

// ── listMyCheckIns ────────────────────────────────────────────────────────────

describe('CheckInsService > listMyCheckIns', () => {
  it('delegates to checkInRepo.findByMember(caller.userId)', async () => {
    const { service, checkInRepo } = makeService();

    const result = await service.listMyCheckIns(memberCaller);

    expect(checkInRepo.findByMember).toHaveBeenCalledWith(memberCaller.userId);
    expect(result).toEqual([makeCheckIn()]);
  });
});

// ── upsertConfig ──────────────────────────────────────────────────────────────

describe('CheckInsService > upsertConfig', () => {
  it('throws NotFoundException when a trainer does not own the target member', async () => {
    const memberOwnedByOther = makeUser({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service } = makeService({
      userRepo: { findById: jest.fn().mockResolvedValue(memberOwnedByOther) },
    });

    const dto = {
      memberId: 'member1',
      dayOfWeek: 1,
      hour: 8,
      minute: 0,
      active: true,
    };

    await expect(service.upsertConfig(trainerCaller, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('calls checkInConfigRepo.upsert with the config fields on success', async () => {
    const { service, checkInConfigRepo } = makeService();

    const dto = {
      memberId: 'member1',
      dayOfWeek: 1,
      hour: 8,
      minute: 30,
      active: true,
    };

    await service.upsertConfig(trainerCaller, dto);

    expect(checkInConfigRepo.upsert).toHaveBeenCalledWith(
      dto.memberId,
      trainerCaller.userId,
      {
        dayOfWeek: dto.dayOfWeek,
        hour: dto.hour,
        minute: dto.minute,
        active: dto.active,
      },
    );
  });
});
