import { inviteStatus } from './invite-status';
import { Invite } from '../types/invites';

const BASE_INVITE: Invite = {
  _id: 'inv1',
  token: 'token-abc',
  role: 'member',
  recipientEmail: 'user@example.com',
  expiresAt: '2099-01-01T00:00:00.000Z',
  usedAt: null,
  trainerId: null,
  invitedBy: 'owner1',
};

describe('inviteStatus', () => {
  it('returns "used" when usedAt is a non-null ISO string regardless of expiry', () => {
    const invite: Invite = {
      ...BASE_INVITE,
      usedAt: '2023-06-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    expect(inviteStatus(invite)).toBe('used');
  });

  it('returns "expired" when usedAt is null and expiresAt is in the past', () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const invite: Invite = {
      ...BASE_INVITE,
      usedAt: null,
      expiresAt: '2026-06-01T00:00:00.000Z',
    };
    expect(inviteStatus(invite, now)).toBe('expired');
  });

  it('returns "pending" when usedAt is null and expiresAt is in the future', () => {
    const now = new Date('2026-06-03T12:00:00.000Z');
    const invite: Invite = {
      ...BASE_INVITE,
      usedAt: null,
      expiresAt: '2026-06-05T00:00:00.000Z',
    };
    expect(inviteStatus(invite, now)).toBe('pending');
  });
});
