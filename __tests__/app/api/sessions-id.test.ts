/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/auth/workout-session-access', () => ({
  authorizeWorkoutSessionWrite: jest.fn(),
}));

const mockSessionRepo = { findById: jest.fn(), delete: jest.fn() };
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(() => mockSessionRepo),
}));

import { auth } from '@/lib/auth/auth';
import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
const mockAuth = jest.mocked(auth);
const mockAuthorize = jest.mocked(authorizeWorkoutSessionWrite);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when member accesses another member session', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockSessionRepo.findById.mockResolvedValue({
      _id: 's1',
      memberId: { toString: () => 'm2' },
    });
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(403);
  });

  it('returns session for member who owns it', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const session = { _id: 's1', memberId: { toString: () => 'm1' }, sets: [] };
    mockSessionRepo.findById.mockResolvedValue(session);
    const { GET } = await import('@/app/api/sessions/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('s1'));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/sessions/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards auth failure (e.g., 403 from authorizeWorkoutSessionWrite)', async () => {
    mockAuthorize.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const { DELETE } = await import('@/app/api/sessions/[id]/route');
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), makeParams('s1'));
    expect(res.status).toBe(403);
    expect(mockSessionRepo.delete).not.toHaveBeenCalled();
  });

  it('deletes the session and returns 204 when authorized', async () => {
    mockAuthorize.mockResolvedValue({
      ok: true,
      workoutSession: { _id: 's1', memberId: 'm1' } as never,
      memberId: 'm1',
      loggedBy: null,
    });
    mockSessionRepo.delete.mockResolvedValue(true);

    const { DELETE } = await import('@/app/api/sessions/[id]/route');
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), makeParams('s1'));
    expect(res.status).toBe(204);
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('s1');
  });
});
