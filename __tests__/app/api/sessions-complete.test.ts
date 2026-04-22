/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockSessionRepo = { findById: jest.fn(), complete: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) { return { params: Promise.resolve({ id }) }; }

describe('POST /api/sessions/[id]/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when non-owner tries to complete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm2' }, completedAt: null });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    expect(res.status).toBe(403);
  });

  it('returns 409 when session already completed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: new Date() });

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    expect(res.status).toBe(409);
  });

  it('completes session and returns updated', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({ _id: 's1', memberId: { toString: () => 'm1' }, completedAt: null });
    const completed = { _id: 's1', completedAt: new Date() };
    mockSessionRepo.complete.mockResolvedValue(completed);

    const { POST } = await import('@/app/api/sessions/[id]/complete/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST' }), makeParams('s1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockSessionRepo.complete).toHaveBeenCalledWith('s1');
    expect(data._id).toBe(completed._id);
    expect(data.completedAt).toBeDefined();
  });
});
