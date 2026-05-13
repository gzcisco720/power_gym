/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');

const mockTokenRepo = {
  findValidByUserId: jest.fn(),
  markUsed: jest.fn(),
};
const mockUserRepo = { updatePassword: jest.fn() };

jest.mock('@/lib/repositories/password-reset-token.repository', () => ({
  MongoPasswordResetTokenRepository: jest.fn(() => mockTokenRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import bcrypt from 'bcryptjs';
const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when no valid token found for user', async () => {
    mockTokenRepo.findValidByUserId.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'bad', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when bcrypt compare fails (wrong token)', async () => {
    mockTokenRepo.findValidByUserId.mockResolvedValue({ _id: 'tid', tokenHash: 'stored-hash' });
    mockBcrypt.compare.mockResolvedValue(false as never);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'wrongtoken', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('updates password and marks token used on valid token', async () => {
    mockTokenRepo.findValidByUserId.mockResolvedValue({ _id: 'tid', tokenHash: 'stored-hash' });
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockBcrypt.hash.mockResolvedValue('newhash' as never);
    mockUserRepo.updatePassword.mockResolvedValue(undefined);
    mockTokenRepo.markUsed.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'goodtoken', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('uid', 'newhash');
    expect(mockTokenRepo.markUsed).toHaveBeenCalledWith('tid');
  });
});
