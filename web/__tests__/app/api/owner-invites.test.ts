/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));
jest.mock('@/lib/auth/invite', () => ({
  createInviteToken: jest.fn().mockResolvedValue({ token: 'tok-1', _id: 'inv1' }),
}));

const now = new Date();
const mockInviteRepo = {
  findAll: jest.fn(),
  create: jest.fn(),
  revoke: jest.fn(),
  regenerate: jest.fn(),
};
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

describe('GET /api/owner/invites', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/owner/invites/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/owner/invites/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns all invites for owner', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findAll.mockResolvedValue([
      { _id: { toString: () => 'i1' }, token: 'tok', role: 'member', recipientEmail: 'a@b.com', expiresAt: now, usedAt: null, trainerId: null },
    ]);
    const { GET } = await import('@/app/api/owner/invites/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockInviteRepo.findAll).toHaveBeenCalled();
  });
});

describe('POST /api/owner/invites', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock } as unknown as ReturnType<typeof getEmailService>);
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/owner/invites/route');
    const res = await POST(new Request('http://localhost/api/owner/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'trainer', recipientEmail: 'trainer@test.com' }),
    }));
    expect(res.status).toBe(401);
  });

  it('creates invite and returns URL', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1', name: 'Owner' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/owner/invites/route');
    const res = await POST(new Request('http://localhost/api/owner/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'trainer', recipientEmail: 'trainer@test.com' }),
    }));
    const data = await res.json() as { inviteUrl: string };
    expect(res.status).toBe(200);
    expect(data.inviteUrl).toContain('tok-1');
  });
});

describe('DELETE /api/owner/invites/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { DELETE } = await import('@/app/api/owner/invites/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('calls revoke and returns 200', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.revoke.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/owner/invites/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockInviteRepo.revoke).toHaveBeenCalledWith('inv1');
  });
});

describe('POST /api/owner/invites/[id]/resend', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock } as unknown as ReturnType<typeof getEmailService>);
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/owner/invites/[id]/resend/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('regenerates token and resends email', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'owner', id: 'o1', name: 'Owner' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.regenerate.mockResolvedValue({
      token: 'regen-tok',
      role: 'member',
      recipientEmail: 'a@b.com',
    });
    const { POST } = await import('@/app/api/owner/invites/[id]/resend/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    const data = await res.json() as { inviteUrl: string };
    expect(res.status).toBe(200);
    expect(data.inviteUrl).toContain('regen-tok');
    expect(sendInviteMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com' }),
    );
  });
});
