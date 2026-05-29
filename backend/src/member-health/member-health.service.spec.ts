import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberHealthService } from './member-health.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import type { IUser } from '../database/models/user.model';
import type { IMemberInjury } from '../database/models/member-injury.model';
import type { IMemberMedication } from '../database/models/member-medication.model';
import type { IMemberMedicalHistory } from '../database/models/member-medical-history.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'member1' },
    trainerId: { toString: () => 'trainer1' },
    role: 'member' as const,
    ...overrides,
  } as unknown as IUser;
}

function makeInjury(): IMemberInjury {
  return {
    _id: 'inj1',
    memberId: 'member1',
    title: 'Knee pain',
  } as unknown as IMemberInjury;
}

function makeMedication(): IMemberMedication {
  return {
    _id: 'med1',
    memberId: 'member1',
    name: 'metoprolol',
  } as unknown as IMemberMedication;
}

function makeMedicalHistory(): IMemberMedicalHistory {
  return {
    _id: 'mh1',
    memberId: 'member1',
  } as unknown as IMemberMedicalHistory;
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    injuryRepo?: Record<string, jest.Mock>;
    medicalHistoryRepo?: Record<string, jest.Mock>;
    medicationRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(makeUser()),
  };
  const injuryRepo = overrides.injuryRepo ?? {
    create: jest.fn().mockResolvedValue(makeInjury()),
    findByMember: jest.fn().mockResolvedValue([makeInjury()]),
  };
  const medicalHistoryRepo = overrides.medicalHistoryRepo ?? {
    upsert: jest.fn().mockResolvedValue(makeMedicalHistory()),
    findByMember: jest.fn().mockResolvedValue(makeMedicalHistory()),
  };
  const medicationRepo = overrides.medicationRepo ?? {
    create: jest.fn().mockResolvedValue(makeMedication()),
    findByMember: jest.fn().mockResolvedValue([makeMedication()]),
  };

  const service = new MemberHealthService(
    userRepo as never,
    injuryRepo as never,
    medicalHistoryRepo as never,
    medicationRepo as never,
  );

  return { service, userRepo, injuryRepo, medicalHistoryRepo, medicationRepo };
}

const ownerCaller: AuthUser = {
  userId: 'owner1',
  email: 'o@x.com',
  role: 'owner',
};
const trainerCaller: AuthUser = {
  userId: 'trainer1',
  email: 't@x.com',
  role: 'trainer',
};
const memberCaller: AuthUser = {
  userId: 'member1',
  email: 'm@x.com',
  role: 'member',
};
const otherMemberCaller: AuthUser = {
  userId: 'member2',
  email: 'm2@x.com',
  role: 'member',
};

const baseInjuryDto = { title: 'Knee pain' };
const baseMedDto = {
  name: 'metoprolol 25mg',
  purpose: 'blood pressure',
  duration: 'long_term' as const,
  startDate: '2026-01-01',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── createInjury ──────────────────────────────────────────────────────────────

describe('MemberHealthService > createInjury', () => {
  it('throws NotFoundException when a trainer does not own the member', async () => {
    const memberOwnedByOther = makeUser({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service } = makeService({
      userRepo: { findById: jest.fn().mockResolvedValue(memberOwnedByOther) },
    });

    await expect(
      service.createInjury(trainerCaller, 'member1', baseInjuryDto),
    ).rejects.toThrow(NotFoundException);
  });

  it("defaults createdByRole to 'trainer' when omitted", async () => {
    const { service, injuryRepo } = makeService();

    await service.createInjury(trainerCaller, 'member1', baseInjuryDto);

    expect(injuryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdByRole: 'trainer' }),
    );
  });
});

// ── listInjuries ──────────────────────────────────────────────────────────────

describe('MemberHealthService > listInjuries', () => {
  it('allows a member to read their own injuries', async () => {
    const { service, injuryRepo } = makeService();

    const result = await service.listInjuries(
      memberCaller,
      memberCaller.userId,
    );

    expect(injuryRepo.findByMember).toHaveBeenCalledWith(memberCaller.userId);
    expect(result).toEqual([makeInjury()]);
  });

  it("throws ForbiddenException when a member reads another member's injuries", async () => {
    const { service } = makeService();

    await expect(
      service.listInjuries(otherMemberCaller, 'member1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── upsertMedicalHistory ──────────────────────────────────────────────────────

describe('MemberHealthService > upsertMedicalHistory', () => {
  it('throws NotFoundException when a trainer does not own the member', async () => {
    const memberOwnedByOther = makeUser({
      trainerId: { toString: () => 'other-trainer' },
    });
    const { service } = makeService({
      userRepo: { findById: jest.fn().mockResolvedValue(memberOwnedByOther) },
    });

    await expect(
      service.upsertMedicalHistory(trainerCaller, 'member1', {}),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── createMedication ──────────────────────────────────────────────────────────

describe('MemberHealthService > createMedication', () => {
  it('returns a drug warning when the medication name matches a known keyword', async () => {
    const { service } = makeService();

    const result = await service.createMedication(
      ownerCaller,
      'member1',
      baseMedDto,
    );

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Beta blocker');
  });

  it('returns an empty warnings array for an unknown medication', async () => {
    const { service } = makeService();

    const result = await service.createMedication(ownerCaller, 'member1', {
      ...baseMedDto,
      name: 'amoxicillin',
    });

    expect(result.warnings).toEqual([]);
  });
});

// ── listMedications ───────────────────────────────────────────────────────────

describe('MemberHealthService > listMedications', () => {
  it("throws ForbiddenException when a member reads another member's medications", async () => {
    const { service } = makeService();

    await expect(
      service.listMedications(otherMemberCaller, 'member1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
