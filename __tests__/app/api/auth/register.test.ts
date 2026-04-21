/**
 * @jest-environment node
 */
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ signIn: jest.fn() }));

const mockUserRepo = {
  findByEmail: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};
const mockInviteRepo = {
  findByToken: jest.fn(),
  create: jest.fn(),
  markUsed: jest.fn(),
};

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));

const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates owner when no users exist', async () => {
    mockUserRepo.count.mockResolvedValue(0);
    mockUserRepo.create.mockResolvedValue({});
    mockBcrypt.hash.mockResolvedValue('hashed' as never);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'Owner', email: 'owner@test.com', password: 'pass' }));
    const data = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'owner' }),
    );
  });

  it('returns 403 when no token and users exist', async () => {
    mockUserRepo.count.mockResolvedValue(1);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass' }));

    expect(res.status).toBe(403);
  });

  it('returns 400 when invite token is invalid', async () => {
    mockInviteRepo.findByToken.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass', token: 'bad' }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when email does not match invite', async () => {
    mockInviteRepo.findByToken.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      recipientEmail: 'other@test.com',
      role: 'member',
      invitedBy: 'inviter-id',
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass', token: 'tok' }));

    expect(res.status).toBe(400);
  });

  it('creates user with role from invite on valid token', async () => {
    mockInviteRepo.findByToken.mockResolvedValue({
      token: 'tok',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      recipientEmail: 'invited@test.com',
      role: 'member',
      invitedBy: { toString: () => 'inviter-id' },
    });
    mockUserRepo.create.mockResolvedValue({});
    mockBcrypt.hash.mockResolvedValue('hashed' as never);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'New', email: 'invited@test.com', password: 'pass', token: 'tok' }));

    expect(res.status).toBe(200);
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'member', trainerId: 'inviter-id' }),
    );
    expect(mockInviteRepo.markUsed).toHaveBeenCalledWith('tok');
  });
});
