/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { create: jest.fn(), findByMember: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, testId: string) {
  return { params: Promise.resolve({ memberId, testId }) };
}

describe('DELETE /api/members/[memberId]/body-tests/[testId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member tries to DELETE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(403);
  });

  it('calls deleteById and returns 204 for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockBodyTestRepo.deleteById.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(204);
    expect(mockBodyTestRepo.deleteById).toHaveBeenCalledWith('bt1', 't1');
  });

  it('calls deleteById and returns 204 for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockBodyTestRepo.deleteById.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/members/[memberId]/body-tests/[testId]/route');
    const res = await DELETE(new Request('http://localhost/', { method: 'DELETE' }), makeParams('m1', 'bt1'));
    expect(res.status).toBe(204);
  });
});
