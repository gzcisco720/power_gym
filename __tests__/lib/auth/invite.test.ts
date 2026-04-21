import { createInviteToken, validateInviteToken } from '@/lib/auth/invite';
import type { IInviteRepository } from '@/lib/repositories/invite.repository';
import type { IInviteToken } from '@/lib/db/models/invite-token.model';

function makeRepo(): jest.Mocked<IInviteRepository> {
  return {
    findByToken: jest.fn(),
    create: jest.fn(),
    markUsed: jest.fn(),
  };
}

describe('createInviteToken', () => {
  it('creates token with 48h expiry and correct fields', async () => {
    const repo = makeRepo();
    const now = Date.now();
    repo.create.mockResolvedValue({ token: 'uuid', role: 'member' } as IInviteToken);

    await createInviteToken(
      { role: 'member', invitedBy: 'owner-id', recipientEmail: 'User@Test.com' },
      repo,
    );

    const call = repo.create.mock.calls[0][0];
    expect(call.role).toBe('member');
    expect(call.invitedBy).toBe('owner-id');
    expect(call.recipientEmail).toBe('user@test.com');
    expect(call.expiresAt.getTime()).toBeGreaterThan(now + 47 * 60 * 60 * 1000);
    expect(typeof call.token).toBe('string');
    expect(call.token.length).toBeGreaterThan(0);
  });
});

describe('validateInviteToken', () => {
  it('returns invalid when invite is null', () => {
    const result = validateInviteToken(null);
    expect(result.valid).toBe(false);
  });

  it('returns invalid when already used', () => {
    const invite = { usedAt: new Date(), expiresAt: new Date(Date.now() + 10000) } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('already-used');
  });

  it('returns invalid when expired', () => {
    const invite = { usedAt: null, expiresAt: new Date(Date.now() - 1000) } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('expired');
  });

  it('returns valid with invite when all checks pass', () => {
    const invite = {
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
    } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(true);
  });
});
