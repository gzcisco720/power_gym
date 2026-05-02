/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));
jest.mock('@/lib/auth/invite', () => ({
  createInviteToken: jest.fn().mockResolvedValue({ token: 'new-uuid' }),
}));

const mockInviteRepo = {
  findByToken: jest.fn(),
  create: jest.fn().mockResolvedValue({ token: 'new-uuid' }),
  markUsed: jest.fn(),
};
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';

const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeRequest(body: object) {
  return new Request('http://localhost/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/invites', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock } as unknown as ReturnType<typeof getEmailService>);
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'member', recipientEmail: 'a@b.com' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to invite trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'T' } } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'trainer', recipientEmail: 'a@b.com' }));

    expect(res.status).toBe(403);
  });

  it('creates invite and sends email when owner invites trainer', async () => {
    mockAuth.mockResolvedValue({
      user: { role: 'owner', id: 'owner-id', name: 'Owner' },
    } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'trainer', recipientEmail: 'trainer@test.com' }));
    const data = await res.json() as { inviteUrl: string };

    expect(res.status).toBe(200);
    expect(data.inviteUrl).toContain('new-uuid');
    expect(sendInviteMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'trainer@test.com', role: 'trainer' }),
    );
  });

  it('creates invite and sends email when trainer invites member', async () => {
    mockAuth.mockResolvedValue({
      user: { role: 'trainer', id: 'trainer-id', name: 'Trainer' },
    } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'member', recipientEmail: 'member@test.com' }));

    expect(res.status).toBe(200);
    expect(sendInviteMock).toHaveBeenCalled();
  });
});
