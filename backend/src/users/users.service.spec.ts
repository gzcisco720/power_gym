import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { IUser } from '../database/models/user.model';
import type { IInviteToken } from '../database/models/invite-token.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'user1' },
    firstName: 'Alice',
    lastName: 'Smith',
    name: 'Alice Smith',
    email: 'alice@example.com',
    passwordHash: 'hashed-pw',
    role: 'member' as const,
    trainerId: { toString: () => 'trainer1' },
    createdAt: new Date(),
    ...overrides,
  } as unknown as IUser;
}

function makeInvite(
  overrides: Partial<Record<string, unknown>> = {},
): IInviteToken {
  return {
    _id: { toString: () => 'inv1' },
    token: 'invite-token',
    role: 'member' as const,
    invitedBy: { toString: () => 'trainer1' },
    recipientEmail: 'alice@example.com',
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null,
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  } as unknown as IInviteToken;
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    inviteRepo?: Record<string, jest.Mock>;
    profileRepo?: Record<string, jest.Mock>;
    emailService?: Record<string, jest.Mock>;
    config?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    findAllMembers: jest.fn().mockResolvedValue([]),
    findByRole: jest.fn().mockResolvedValue([]),
    updateTrainerId: jest.fn().mockResolvedValue(undefined),
    findMembersJoinedByMonth: jest.fn().mockResolvedValue([]),
  };
  const inviteRepo = overrides.inviteRepo ?? {
    create: jest.fn().mockResolvedValue(makeInvite()),
    findById: jest.fn().mockResolvedValue(null),
    regenerate: jest.fn().mockResolvedValue(makeInvite()),
    countPending: jest.fn().mockResolvedValue(0),
  };
  const profileRepo = overrides.profileRepo ?? {
    findByUserId: jest.fn().mockResolvedValue(null),
  };
  const emailService = overrides.emailService ?? {
    sendInvite: jest.fn().mockResolvedValue(undefined),
  };
  const config = overrides.config ?? {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const service = new UsersService(
    userRepo as never,
    inviteRepo as never,
    profileRepo as never,
    emailService as never,
    config as never,
  );

  return { service, userRepo, inviteRepo, profileRepo, emailService, config };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── listMembers ───────────────────────────────────────────────────────────────

describe('UsersService > listMembers', () => {
  it('calls findAllMembers() with no arg for owner', async () => {
    const { service, userRepo } = makeService();

    await service.listMembers('owner', 'owner1');

    expect(userRepo.findAllMembers).toHaveBeenCalledWith(/* no args */);
    expect(userRepo.findAllMembers).toHaveBeenCalledTimes(1);
  });

  it('calls findAllMembers(callerId) for trainer', async () => {
    const { service, userRepo } = makeService();

    await service.listMembers('trainer', 'trainer1');

    expect(userRepo.findAllMembers).toHaveBeenCalledWith('trainer1');
  });
});

// ── getMember ─────────────────────────────────────────────────────────────────

describe('UsersService > getMember', () => {
  it('throws NotFoundException when member missing or role !== member', async () => {
    const { service } = makeService();
    // userRepo.findById returns null by default

    await expect(
      service.getMember('owner', 'owner1', 'unknown-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when member role is not member', async () => {
    const trainer = makeUser({
      role: 'trainer',
      _id: { toString: () => 'trainer1' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(trainer);

    await expect(
      service.getMember('owner', 'owner1', 'trainer1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when trainer requests a member they do not own', async () => {
    const member = makeUser({ trainerId: { toString: () => 'other-trainer' } });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(member);

    await expect(
      service.getMember('trainer', 'trainer1', 'user1'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── assignTrainer ─────────────────────────────────────────────────────────────

describe('UsersService > assignTrainer', () => {
  it('throws NotFoundException for a non-member', async () => {
    const { service } = makeService();

    await expect(service.assignTrainer('user1', 'trainer1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('calls updateTrainerId on success', async () => {
    const member = makeUser({ role: 'member' });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(member);

    await service.assignTrainer('user1', 'trainer1');

    expect(userRepo.updateTrainerId).toHaveBeenCalledWith('user1', 'trainer1');
  });
});

// ── createInvite ──────────────────────────────────────────────────────────────

describe('UsersService > createInvite', () => {
  it("throws ForbiddenException when caller role is 'member'", async () => {
    const { service } = makeService();

    await expect(
      service.createInvite('member', 'member1', {
        role: 'member',
        recipientEmail: 'a@b.com',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when a trainer tries to invite a trainer', async () => {
    const { service } = makeService();

    await expect(
      service.createInvite('trainer', 'trainer1', {
        role: 'trainer',
        recipientEmail: 'a@b.com',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forces trainerId to callerId when a trainer invites a member', async () => {
    const caller = makeUser({
      role: 'trainer',
      _id: { toString: () => 'trainer1' },
    });
    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findById.mockResolvedValue(caller);
    inviteRepo.create.mockResolvedValue(
      makeInvite({ trainerId: { toString: () => 'trainer1' } }),
    );

    await service.createInvite('trainer', 'trainer1', {
      role: 'member',
      recipientEmail: 'a@b.com',
    });

    expect(inviteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: 'trainer1' }),
    );
  });

  it('throws BadRequestException when owner supplies a trainerId that is not an existing trainer', async () => {
    const nonTrainer = makeUser({
      role: 'member',
      _id: { toString: () => 'member2' },
    });
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(nonTrainer);

    await expect(
      service.createInvite('owner', 'owner1', {
        role: 'member',
        recipientEmail: 'a@b.com',
        trainerId: 'member2',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ── resendInvite ──────────────────────────────────────────────────────────────

describe('UsersService > resendInvite', () => {
  it('throws ForbiddenException when trainer resends an invite they did not create', async () => {
    const invite = makeInvite({
      invitedBy: { toString: () => 'other-trainer' },
    });
    const { service, inviteRepo } = makeService();
    inviteRepo.findById.mockResolvedValue(invite);

    await expect(
      service.resendInvite('inv1', 'trainer', 'trainer1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── assertInviteOwner ─────────────────────────────────────────────────────────

describe('UsersService > assertInviteOwner', () => {
  it('throws ForbiddenException when invite missing', async () => {
    const { service } = makeService();

    await expect(service.assertInviteOwner('inv1', 'trainer1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when invitedBy !== callerId', async () => {
    const invite = makeInvite({
      invitedBy: { toString: () => 'other-trainer' },
    });
    const { service, inviteRepo } = makeService();
    inviteRepo.findById.mockResolvedValue(invite);

    await expect(service.assertInviteOwner('inv1', 'trainer1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ── getOwnerStats ─────────────────────────────────────────────────────────────

describe('UsersService > getOwnerStats', () => {
  it('returns trainerCount, memberCount, pendingInviteCount, membersByMonth from parallel repo calls', async () => {
    const trainers = [
      makeUser({ role: 'trainer' }),
      makeUser({ role: 'trainer' }),
    ];
    const members = [makeUser(), makeUser(), makeUser()];
    const monthlyData = [
      { label: 'Jan', newCount: 1 },
      { label: 'Feb', newCount: 2 },
    ];

    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByRole.mockResolvedValue(trainers);
    userRepo.findAllMembers.mockResolvedValue(members);
    inviteRepo.countPending.mockResolvedValue(5);
    userRepo.findMembersJoinedByMonth.mockResolvedValue(monthlyData);

    const result = await service.getOwnerStats();

    expect(result).toEqual({
      trainerCount: 2,
      memberCount: 3,
      pendingInviteCount: 5,
      membersByMonth: monthlyData,
    });
    expect(userRepo.findByRole).toHaveBeenCalledWith('trainer');
    expect(userRepo.findMembersJoinedByMonth).toHaveBeenCalledWith(6);
  });
});

// ── getMemberProfile ──────────────────────────────────────────────────────────

describe('UsersService > getMemberProfile', () => {
  it("throws ForbiddenException when a member requests another member's profile", async () => {
    const { service } = makeService();

    await expect(
      service.getMemberProfile('member', 'member1', 'member2'),
    ).rejects.toThrow(ForbiddenException);
  });
});
