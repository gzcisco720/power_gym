/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');
jest.mock('crypto');
jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn(() => true) }));

const mockUserRepo = { findByEmail: jest.fn() };
const mockTokenRepo = { create: jest.fn() };
const mockEmailService = { sendPasswordReset: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/password-reset-token.repository', () => ({
  MongoPasswordResetTokenRepository: jest.fn(() => mockTokenRepo),
}));
jest.mock('@/lib/email/index', () => ({
  getEmailService: jest.fn(() => mockEmailService),
}));

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
const mockCheckRateLimit = jest.mocked(checkRateLimit);

const mockBcrypt = jest.mocked(bcrypt);
const mockCrypto = jest.mocked(crypto);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const res = await POST(new Request('http://localhost/api/auth/forgot-password', { method: 'POST' }));
    expect(res.status).toBe(429);
  });

  it('returns 200 even when user does not exist (no enumeration)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const res = await POST(makeRequest({ email: 'unknown@test.com' }));
    expect(res.status).toBe(200);
    expect(mockTokenRepo.create).not.toHaveBeenCalled();
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('creates token and sends email when user exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ _id: { toString: () => 'user-id' }, email: 'user@test.com' });
    (mockCrypto.randomBytes as jest.Mock).mockReturnValue({ toString: () => 'rawtoken123' });
    mockBcrypt.hash.mockResolvedValue('hashed-token' as never);
    mockTokenRepo.create.mockResolvedValue({});
    mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const res = await POST(makeRequest({ email: 'user@test.com' }));
    const data = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTokenRepo.create).toHaveBeenCalledWith(
      'user-id',
      'hashed-token',
      expect.any(Date),
    );
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com' }),
    );
  });
});
