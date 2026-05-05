/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));
jest.mock('@/lib/auth/invite', () => ({
  createInviteToken: jest.fn().mockResolvedValue({ token: 'trainer-tok-1', _id: 'inv1' }),
}));

const now = new Date();
const mockInviteRepo = {
  findAll: jest.fn(),
  findByInvitedBy: jest.fn(),
  findById: jest.fn(),
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

describe('GET /api/trainer/invites', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/trainer/invites/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'member', id: 'm1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/trainer/invites/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns only trainer own invites', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findByInvitedBy.mockResolvedValue([
      { _id: { toString: () => 'i1' }, token: 'tok', role: 'member', recipientEmail: 'a@b.com', expiresAt: now, usedAt: null, trainerId: { toString: () => 't1' }, invitedBy: { toString: () => 't1' } },
    ]);
    const { GET } = await import('@/app/api/trainer/invites/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockInviteRepo.findByInvitedBy).toHaveBeenCalledWith('t1');
  });
});

describe('POST /api/trainer/invites', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock } as unknown as ReturnType<typeof getEmailService>);
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/trainer/invites/route');
    const res = await POST(new Request('http://localhost/api/trainer/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'member@test.com' }),
    }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'member', id: 'm1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/trainer/invites/route');
    const res = await POST(new Request('http://localhost/api/trainer/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'member@test.com' }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates member invite and returns URL', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'Trainer One' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/trainer/invites/route');
    const res = await POST(new Request('http://localhost/api/trainer/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: 'member@test.com' }),
    }));
    const data = await res.json() as { inviteUrl: string };
    expect(res.status).toBe(200);
    expect(data.inviteUrl).toContain('trainer-tok-1');
  });

  it('returns 400 when recipientEmail missing', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'Trainer One' } } as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/trainer/invites/route');
    const res = await POST(new Request('http://localhost/api/trainer/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/trainer/invites/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { DELETE } = await import('@/app/api/trainer/invites/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when invite belongs to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findById.mockResolvedValue({ _id: 'inv1', invitedBy: { toString: () => 'other-trainer' } });
    const { DELETE } = await import('@/app/api/trainer/invites/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('revokes own invite and returns 200', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findById.mockResolvedValue({ _id: 'inv1', invitedBy: { toString: () => 't1' } });
    mockInviteRepo.revoke.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/trainer/invites/[id]/route');
    const res = await DELETE(
      new Request('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockInviteRepo.revoke).toHaveBeenCalledWith('inv1');
  });
});

describe('POST /api/trainer/invites/[id]/resend', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock } as unknown as ReturnType<typeof getEmailService>);
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { POST } = await import('@/app/api/trainer/invites/[id]/resend/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when invite belongs to another trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'T1' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findById.mockResolvedValue({ invitedBy: { toString: () => 'other-trainer' } });
    const { POST } = await import('@/app/api/trainer/invites/[id]/resend/route');
    const res = await POST(
      new Request('http://localhost', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv1' }) },
    );
    expect(res.status).toBe(403);
  });

  it('regenerates token and resends email', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'Trainer One' } } as unknown as Awaited<ReturnType<typeof auth>>);
    mockInviteRepo.findById.mockResolvedValue({ invitedBy: { toString: () => 't1' } });
    mockInviteRepo.regenerate.mockResolvedValue({
      token: 'regen-tok',
      role: 'member',
      recipientEmail: 'a@b.com',
    });
    const { POST } = await import('@/app/api/trainer/invites/[id]/resend/route');
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
