import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { OwnerInvitesService } from './owner-invites.service';
import type { IInviteToken } from '../database/models/invite-token.model';

function makeInvite(
  overrides: Partial<Record<string, unknown>> = {},
): IInviteToken {
  return {
    _id: { toString: () => 'inv1' },
    token: 'tok-abc',
    role: 'member' as const,
    invitedBy: { toString: () => 'owner1' },
    recipientEmail: 'new@test.com',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
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
    findAll: jest.fn().mockResolvedValue([]),
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

  const service = new OwnerInvitesService(
    inviteRepo as never,
    emailService as never,
    configService as never,
  );
  return { service, inviteRepo, emailService, configService };
}

// ── OwnerInvitesService > create ─────────────────────────────────────────────

describe('OwnerInvitesService > create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists invite token and calls EmailService.sendInvite once', async () => {
    const invite = makeInvite();
    const create = jest.fn().mockResolvedValue(invite);
    const sendInvite = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findAll: jest.fn(),
        findById: jest.fn(),
        create,
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
      emailService: { sendInvite },
    });

    const result = await service.create(
      { email: 'new@test.com', role: 'member' },
      { userId: 'owner1', name: 'Dev Owner' },
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'new@test.com',
        role: 'member',
        invitedBy: 'owner1',
        token: expect.any(String) as jest.AsymmetricMatcher,
        expiresAt: expect.any(Date) as jest.AsymmetricMatcher,
      }),
    );

    expect(sendInvite).toHaveBeenCalledTimes(1);
    expect(sendInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@test.com',
        role: 'member',
        inviteUrl: expect.any(String) as jest.AsymmetricMatcher,
      }),
    );

    expect(result).toHaveProperty('inviteUrl');
  });
});

// ── OwnerInvitesService > list ───────────────────────────────────────────────

describe('OwnerInvitesService > list', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns pending invites for the gym', async () => {
    const inv1 = makeInvite({
      _id: { toString: () => 'inv1' },
      recipientEmail: 'a@test.com',
    });
    const inv2 = makeInvite({
      _id: { toString: () => 'inv2' },
      recipientEmail: 'b@test.com',
      usedAt: new Date(),
    });
    const findAll = jest.fn().mockResolvedValue([inv1, inv2]);

    const { service } = makeService({
      inviteRepo: {
        findAll,
        findById: jest.fn(),
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    const result = await service.list();

    expect(findAll).toHaveBeenCalledTimes(1);
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

// ── OwnerInvitesService > revoke ─────────────────────────────────────────────

describe('OwnerInvitesService > revoke', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the invite when found', async () => {
    const invite = makeInvite();
    const findById = jest.fn().mockResolvedValue(invite);
    const revoke = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findAll: jest.fn(),
        findById,
        create: jest.fn(),
        revoke,
        regenerate: jest.fn(),
      },
    });

    await service.revoke('inv1');

    expect(findById).toHaveBeenCalledWith('inv1');
    expect(revoke).toHaveBeenCalledWith('inv1');
  });

  it('404s on unknown id', async () => {
    const findById = jest.fn().mockResolvedValue(null);

    const { service } = makeService({
      inviteRepo: {
        findAll: jest.fn(),
        findById,
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate: jest.fn(),
      },
    });

    await expect(service.revoke('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});

// ── OwnerInvitesService > resend ─────────────────────────────────────────────

describe('OwnerInvitesService > resend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('regenerates token and calls EmailService.sendInvite once', async () => {
    const updated = makeInvite({ token: 'new-tok' });
    const regenerate = jest.fn().mockResolvedValue(updated);
    const sendInvite = jest.fn().mockResolvedValue(undefined);

    const { service } = makeService({
      inviteRepo: {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        revoke: jest.fn(),
        regenerate,
      },
      emailService: { sendInvite },
    });

    const result = await service.resend('inv1', 'Dev Owner');

    expect(regenerate).toHaveBeenCalledWith('inv1');
    expect(sendInvite).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('inviteUrl');
  });
});
