import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { IServiceType } from '../database/models/service-type.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

const owner: AuthUser = { userId: 'o1', email: 'o@x.com', role: 'owner' };
const trainer: AuthUser = { userId: 't1', email: 't@x.com', role: 'trainer' };
const memberUser: AuthUser = { userId: 'm1', email: 'm@x.com', role: 'member' };

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'm1' },
    role: 'member',
    trainerId: { toString: () => 't1' },
    ...overrides,
  };
}

function makeServiceType(
  overrides: Record<string, unknown> = {},
): IServiceType {
  return {
    _id: { toString: () => 'st1' },
    name: 'PT',
    pricePerSession: 100,
    currency: 'AUD',
    durationMin: 60,
    note: null,
    isActive: true,
    createdBy: { toString: () => 'o1' },
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as IServiceType;
}

// A past session relative to any frozen date >= 2026-06-16
const pastSession = {
  _id: { toString: () => 's1' },
  date: new Date('2026-06-01T00:00:00Z'),
  startTime: '09:00',
  endTime: '10:00',
  status: 'scheduled' as const,
  serviceTypeId: { toString: () => 'st1' },
};

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    serviceTypeRepo?: Record<string, jest.Mock>;
    scheduledSessionRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(null),
  };
  const serviceTypeRepo = overrides.serviceTypeRepo ?? {
    create: jest.fn().mockResolvedValue(makeServiceType()),
    findActive: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
  };
  const scheduledSessionRepo = overrides.scheduledSessionRepo ?? {
    findForBilling: jest.fn().mockResolvedValue([]),
  };
  const service = new BillingService(
    userRepo as never,
    serviceTypeRepo as never,
    scheduledSessionRepo as never,
  );
  return { service, userRepo, serviceTypeRepo, scheduledSessionRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── createServiceType ─────────────────────────────────────────────────────────

describe('BillingService > createServiceType', () => {
  it('trims name and note and sets createdBy=caller.userId', async () => {
    const { service, serviceTypeRepo } = makeService();
    const dto = {
      name: '  PT  ',
      durationMin: 60,
      pricePerSession: 100,
      note: '  Note  ',
    };

    await service.createServiceType(owner, dto);

    expect(serviceTypeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'PT',
        note: 'Note',
        createdBy: 'o1',
      }),
    );
  });
});

// ── findActiveServiceTypes ────────────────────────────────────────────────────

describe('BillingService > findActiveServiceTypes', () => {
  it('delegates to serviceTypeRepo.findActive', async () => {
    const types = [makeServiceType()];
    const { service, serviceTypeRepo } = makeService();
    serviceTypeRepo.findActive.mockResolvedValue(types);

    const result = await service.findActiveServiceTypes();

    expect(serviceTypeRepo.findActive).toHaveBeenCalledTimes(1);
    expect(result).toBe(types);
  });
});

// ── getMemberBilling ──────────────────────────────────────────────────────────

describe('BillingService > getMemberBilling', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws ForbiddenException when a member requests another member's billing", async () => {
    const { service } = makeService();

    await expect(
      service.getMemberBilling(memberUser, 'other-member'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when a trainer does not own the member', async () => {
    const foreignMember = makeMember({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(foreignMember);

    await expect(service.getMemberBilling(trainer, 'm1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('defaults the from-date to the first of the current month when no from is given', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15'));
    const { service, scheduledSessionRepo } = makeService();

    await service.getMemberBilling(owner, 'm1');

    const [, calledFrom] = scheduledSessionRepo.findForBilling.mock
      .calls[0] as [string, Date, Date];
    expect(calledFrom).toEqual(new Date('2026-06-01T00:00:00.000'));
  });

  it('calls scheduledSessionRepo.findForBilling with the resolved date window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15'));
    const { service, scheduledSessionRepo } = makeService();

    await service.getMemberBilling(owner, 'm1');

    expect(scheduledSessionRepo.findForBilling).toHaveBeenCalledWith(
      'm1',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('totals only the sessions returned by the repo', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-16T12:00:00Z'));
    const st = makeServiceType();
    const { service, scheduledSessionRepo, serviceTypeRepo } = makeService();
    scheduledSessionRepo.findForBilling.mockResolvedValue([
      pastSession,
      pastSession,
    ]);
    serviceTypeRepo.findByIds.mockResolvedValue([st]);

    const result = await service.getMemberBilling(owner, 'm1');

    expect(result.total).toBe(200);
    expect(result.count).toBe(2);
  });
});
