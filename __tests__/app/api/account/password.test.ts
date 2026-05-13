/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');

const mockUserRepo = {
  findById: jest.fn(),
  updatePassword: jest.fn(),
};
const mockSession = { user: { id: 'user-id' } };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn(() => mockSession) }));

import bcrypt from 'bcryptjs';
const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/account/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/account/password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    jest.mocked(auth).mockResolvedValueOnce(null);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'old', newPassword: 'New1pass!' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when new password is too weak', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(true as never);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'old', newPassword: 'weak' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when current password is wrong', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(false as never);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'wrong', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('updates password when valid', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'oldhash' });
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockBcrypt.hash.mockResolvedValue('newhash' as never);
    mockUserRepo.updatePassword.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user-id', 'newhash');
  });
});
