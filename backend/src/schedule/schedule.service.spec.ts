import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { IScheduledSession } from '../database/models/scheduled-session.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

const owner: AuthUser = { userId: 'o1', email: 'o@x.com', role: 'owner' };
const trainer: AuthUser = { userId: 't1', email: 't@x.com', role: 'trainer' };
const member: AuthUser = { userId: 'm1', email: 'm@x.com', role: 'member' };

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'm1' },
    role: 'member',
    trainerId: { toString: () => 't1' },
    ...overrides,
  };
}

function makeSession(
  overrides: Record<string, unknown> = {},
): IScheduledSession {
  return {
    _id: 'sess1',
    trainerId: 't1',
    memberIds: ['m1'],
    date: new Date('2026-06-01'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    ...overrides,
  } as unknown as IScheduledSession;
}

function makeService(
  overrides: {
    sessionRepo?: Record<string, jest.Mock>;
    userRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const sessionRepo = overrides.sessionRepo ?? {
    create: jest.fn().mockResolvedValue(makeSession()),
    findByMember: jest.fn().mockResolvedValue([]),
    findByIdAndTrainer: jest.fn().mockResolvedValue(null),
    cancelById: jest.fn().mockResolvedValue(makeSession()),
  };
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(null),
  };
  const service = new ScheduleService(sessionRepo as never, userRepo as never);
  return { service, sessionRepo, userRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── create ────────────────────────────────────────────────────────────────────

describe('ScheduleService > create', () => {
  it('throws NotFoundException when a trainer schedules a member they do not own', async () => {
    const foreignMember = makeMember({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(foreignMember);

    const dto = {
      memberIds: ['m1'],
      date: '2026-07-01',
      startTime: '09:00',
      endTime: '10:00',
    };
    await expect(service.create(trainer, dto as never)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('calls sessionRepo.create with trainerId=caller.userId and the parsed date', async () => {
    const ownMember = makeMember();
    const { service, sessionRepo, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(ownMember);

    const dto = {
      memberIds: ['m1'],
      date: '2026-07-01',
      startTime: '09:00',
      endTime: '10:00',
    };
    await service.create(trainer, dto);

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trainerId: 't1',
        date: expect.any(Date) as jest.AsymmetricMatcher,
      }),
    );
  });
});

// ── getMemberCalendar ─────────────────────────────────────────────────────────

describe('ScheduleService > getMemberCalendar', () => {
  it("throws ForbiddenException when a member requests another member's calendar", async () => {
    const { service } = makeService();

    await expect(
      service.getMemberCalendar(member, 'other-member'),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── cancel ────────────────────────────────────────────────────────────────────

describe('ScheduleService > cancel', () => {
  it('cancels by id directly for an owner (no findByIdAndTrainer call)', async () => {
    const session = makeSession({ status: 'cancelled' });
    const { service, sessionRepo } = makeService({
      sessionRepo: {
        cancelById: jest.fn().mockResolvedValue(session),
        findByIdAndTrainer: jest.fn(),
        create: jest.fn(),
        findByMember: jest.fn(),
      },
    });

    await service.cancel(owner, 'sess1');

    expect(sessionRepo.cancelById).toHaveBeenCalledWith('sess1');
    expect(sessionRepo.findByIdAndTrainer).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when a trainer does not own the session', async () => {
    const { service } = makeService({
      sessionRepo: {
        findByIdAndTrainer: jest.fn().mockResolvedValue(null),
        cancelById: jest.fn(),
        create: jest.fn(),
        findByMember: jest.fn(),
      },
    });

    await expect(service.cancel(trainer, 'sess1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when cancelById returns null', async () => {
    const existing = makeSession();
    const { service } = makeService({
      sessionRepo: {
        findByIdAndTrainer: jest.fn().mockResolvedValue(existing),
        cancelById: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findByMember: jest.fn(),
      },
    });

    await expect(service.cancel(trainer, 'sess1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
