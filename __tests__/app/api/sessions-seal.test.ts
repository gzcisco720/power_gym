jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/workout-session-access', () => ({
  authorizeWorkoutSessionWrite: jest.fn(),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn(),
}));

import { POST } from '@/app/api/sessions/[id]/seal/route';
import { authorizeWorkoutSessionWrite } from '@/lib/auth/workout-session-access';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

const mockAuth = jest.mocked(authorizeWorkoutSessionWrite);
const mockRepo = jest.mocked(MongoWorkoutSessionRepository);

describe('POST /api/sessions/[id]/seal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards auth failure', async () => {
    mockAuth.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'S1' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns the session as-is when already completed (idempotent)', async () => {
    const completed = {
      _id: 'S1',
      completedAt: new Date('2026-05-08T10:00:00Z'),
      memberId: 'm1',
    };
    mockAuth.mockResolvedValue({
      ok: true,
      workoutSession: completed as never,
      memberId: 'm1',
      loggedBy: null,
    });
    const seal = jest.fn();
    mockRepo.mockImplementation(() => ({ seal } as unknown as MongoWorkoutSessionRepository));

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'S1' }),
    });
    expect(res.status).toBe(200);
    expect(seal).not.toHaveBeenCalled();
  });

  it('seals an active session', async () => {
    const active = { _id: 'S1', completedAt: null, memberId: 'm1' };
    mockAuth.mockResolvedValue({
      ok: true,
      workoutSession: active as never,
      memberId: 'm1',
      loggedBy: null,
    });
    const seal = jest.fn().mockResolvedValue({ ...active, completedAt: new Date() });
    mockRepo.mockImplementation(() => ({ seal } as unknown as MongoWorkoutSessionRepository));

    const res = await POST(new Request('http://x', { method: 'POST' }), {
      params: Promise.resolve({ id: 'S1' }),
    });
    expect(res.status).toBe(200);
    expect(seal).toHaveBeenCalledWith('S1');
  });
});
