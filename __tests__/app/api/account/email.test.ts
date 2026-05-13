/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = {
  findByEmail: jest.fn(),
  updateEmail: jest.fn(),
};
const mockSession = { user: { id: 'user-id', email: 'old@test.com' } };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn(() => mockSession) }));

function makeRequest(body: object) {
  return new Request('http://localhost/api/account/email', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/account/email', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    jest.mocked(auth).mockResolvedValueOnce(null);

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'new@test.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email format', async () => {
    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already taken by another user', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ _id: { toString: () => 'other-id' } });

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'taken@test.com' }));
    expect(res.status).toBe(409);
  });

  it('allows updating to same email (idempotent)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ _id: { toString: () => 'user-id' } });
    mockUserRepo.updateEmail.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'old@test.com' }));
    expect(res.status).toBe(200);
  });

  it('updates email when valid and unique', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.updateEmail.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'new@test.com' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updateEmail).toHaveBeenCalledWith('user-id', 'new@test.com');
  });
});
