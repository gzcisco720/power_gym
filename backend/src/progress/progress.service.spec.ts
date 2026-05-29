import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { IPersonalBest } from '../database/models/personal-best.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

const owner: AuthUser = { userId: 'o1', email: 'o@x.com', role: 'owner' };
const trainer: AuthUser = { userId: 't1', email: 't@x.com', role: 'trainer' };
const member: AuthUser = { userId: 'm1', email: 'm@x.com', role: 'member' };

function makePB(overrides: Record<string, unknown> = {}): IPersonalBest {
  return {
    _id: { toString: () => 'pb1' },
    memberId: { toString: () => 'm1' },
    exerciseId: { toString: () => 'ex1' },
    exerciseName: 'Squat',
    bestWeight: 100,
    bestReps: 5,
    estimatedOneRM: 112,
    achievedAt: new Date('2026-05-01'),
    sessionId: { toString: () => 'sess1' },
    ...overrides,
  } as unknown as IPersonalBest;
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'm1' },
    role: 'member',
    trainerId: { toString: () => 't1' },
    ...overrides,
  };
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    personalBestRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(null),
  };
  const personalBestRepo = overrides.personalBestRepo ?? {
    findByMemberSorted: jest.fn().mockResolvedValue([]),
  };
  const service = new ProgressService(
    userRepo as never,
    personalBestRepo as never,
  );
  return { service, userRepo, personalBestRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── getMemberProgress ─────────────────────────────────────────────────────────

describe('ProgressService > getMemberProgress', () => {
  it("throws ForbiddenException when a member requests another member's progress", async () => {
    const { service } = makeService();

    await expect(
      service.getMemberProgress(member, 'other-member'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when a trainer does not own the member', async () => {
    const foreignMember = makeMember({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(foreignMember);

    await expect(service.getMemberProgress(trainer, 'm1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('calls personalBestRepo.findByMemberSorted and maps results into oneRepMaxTrend', async () => {
    const pb1 = makePB({
      exerciseName: 'Squat',
      estimatedOneRM: 112,
      achievedAt: new Date('2026-05-01'),
    });
    const pb2 = makePB({
      exerciseName: 'Deadlift',
      estimatedOneRM: 150,
      achievedAt: new Date('2026-05-15'),
    });
    const { service, personalBestRepo } = makeService({
      personalBestRepo: {
        findByMemberSorted: jest.fn().mockResolvedValue([pb1, pb2]),
      },
    });

    const result = await service.getMemberProgress(owner, 'm1');

    expect(personalBestRepo.findByMemberSorted).toHaveBeenCalledWith('m1');
    expect(result.oneRepMaxTrend).toEqual([
      {
        exerciseName: 'Squat',
        estimatedOneRM: 112,
        achievedAt: pb1.achievedAt,
      },
      {
        exerciseName: 'Deadlift',
        estimatedOneRM: 150,
        achievedAt: pb2.achievedAt,
      },
    ]);
  });
});
