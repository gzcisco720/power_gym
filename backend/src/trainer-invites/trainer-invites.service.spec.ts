import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrainerInvitesService } from './trainer-invites.service';
import type { IInviteToken } from '../database/models/invite-token.model';

function makeInvite(
  overrides: Partial<Record<string, unknown>> = {},
): IInviteToken {
  return {
    _id: { toString: () => 'inv1' },
    token: 'tok-abc',
    role: 'member' as const,
    invitedBy: { toString: () => 'trainer1' },
    recipientEmail: 'member@test.com',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  } as unknown as IInviteToken;
}

function makeService(
  overrides: {
    inviteRepo?: Record<string, jest.Mock>;
    emailService?: Record<string, jest.Mock>;
    configService?: Record<string, jest.Mock>;
  } = {},
) {
  const inviteRepo = overrides.inviteRepo ?? {
    findByInvitedBy: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(makeInvite()),
    revoke: jest.fn().mockResolvedValue(undefined),
    regenerate: jest.fn().mockResolvedValue(makeInvite()),
  };
  const emailService = overrides.emailService ?? {
    sendInvite: jest.fn().mockResolvedValue(undefined),
  };
  const configService = overrides.configService ?? {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const service = new TrainerInvitesService(
    inviteRepo as never,
    emailService as never,
    configService as never,
  );
  return { service, inviteRepo, emailService, configService };
}

// ── TrainerInvitesService > create ───────────────────────────────────────────

describe('TrainerInvitesService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists invite with inviterId = trainer and sends email', async () => {
    const invite = makeInvite();
    const create = jest.fn().mockResolvedValue(invite);
    const sendInvite = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById: jest.fn(),
        create,
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
      emailService: { sendInvite },
    });

    const result = await service.create(
      { email: 'member@test.com' },
      { userId: 'trainer1', name: 'Dev Trainer' },
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'member@test.com',
        role: 'member',
        invitedBy: 'trainer1',
        trainerId: 'trainer1',
        token: expect.any(String) as jest.AsymmetricMatcher,
        expiresAt: expect.any(Date) as jest.AsymmetricMatcher,
      }),
    );

    expect(sendInvite).toHaveBeenCalledTimes(1);
    expect(sendInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'member@test.com',
        role: 'member',
        inviteUrl: expect.any(String) as jest.AsymmetricMatcher,
      }),
    );

    expect(result).toHaveProperty('inviteUrl');
  });
});

// ── TrainerInvitesService > list ─────────────────────────────────────────────

describe('TrainerInvitesService > list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only invites created by the requesting trainer', async () => {
    const inv1 = makeInvite({
      _id: { toString: () => 'inv1' },
      recipientEmail: 'a@test.com',
      invitedBy: { toString: () => 'trainer1' },
    });
    const inv2 = makeInvite({
      _id: { toString: () => 'inv2' },
      recipientEmail: 'b@test.com',
      invitedBy: { toString: () => 'trainer1' },
    });
    const findByInvitedBy = jest.fn().mockResolvedValue([inv1, inv2]);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy,
        findById: jest.fn(),
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    const result = await service.list('trainer1');

    expect(findByInvitedBy).toHaveBeenCalledWith('trainer1');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      _id: 'inv1',
      recipientEmail: 'a@test.com',
    });
    expect(result[1]).toMatchObject({
      _id: 'inv2',
      recipientEmail: 'b@test.com',
    });
  });
});

// ── TrainerInvitesService > revoke ───────────────────────────────────────────

describe('TrainerInvitesService > revoke', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revokes when the invite belongs to the trainer', async () => {
    const invite = makeInvite({ invitedBy: { toString: () => 'trainer1' } });
    const findById = jest.fn().mockResolvedValue(invite);
    const revoke = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById,
        create: jest.fn(),
        revoke,
        regenerate: jest.fn(),
      },
    });

    await service.revoke('inv1', 'trainer1');

    expect(findById).toHaveBeenCalledWith('inv1');
    expect(revoke).toHaveBeenCalledWith('inv1');
  });

  it('404 on an invite the trainer does not own', async () => {
    const invite = makeInvite({
      invitedBy: { toString: () => 'other-trainer' },
    });
    const findById = jest.fn().mockResolvedValue(invite);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById,
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    await expect(service.revoke('inv1', 'trainer1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('404 on unknown id', async () => {
    const findById = jest.fn().mockResolvedValue(null);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById,
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    await expect(service.revoke('nonexistent', 'trainer1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── TrainerInvitesService > resend ───────────────────────────────────────────

describe('TrainerInvitesService > resend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('403 when the invite does not belong to the trainer', async () => {
    const invite = makeInvite({
      invitedBy: { toString: () => 'other-trainer' },
    });
    const findById = jest.fn().mockResolvedValue(invite);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById,
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    await expect(
      service.resend('inv1', 'trainer1', 'Dev Trainer'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('regenerates token and sends email when trainer owns the invite', async () => {
    const invite = makeInvite({ invitedBy: { toString: () => 'trainer1' } });
    const updated = makeInvite({
      token: 'new-tok',
      invitedBy: { toString: () => 'trainer1' },
    });
    const findById = jest.fn().mockResolvedValue(invite);
    const regenerate = jest.fn().mockResolvedValue(updated);
    const sendInvite = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findByInvitedBy: jest.fn(),
        findById,
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate,
      },
      emailService: { sendInvite },
    });

    const result = await service.resend('inv1', 'trainer1', 'Dev Trainer');

    expect(regenerate).toHaveBeenCalledWith('inv1');
    expect(sendInvite).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('inviteUrl');
  });
});
