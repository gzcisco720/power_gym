/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockRepo = {
  findById: jest.fn(),
  updateOne: jest.fn(),
  updateFuture: jest.fn(),
  updateAll: jest.fn(),
  cancelOne: jest.fn(),
  cancelFuture: jest.fn(),
  cancelAll: jest.fn(),
};
jest.mock('@/lib/repositories/scheduled-session.repository', () => ({
  MongoScheduledSessionRepository: jest.fn(() => mockRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const params = { params: Promise.resolve({ id: 'sess1' }) };

describe('PATCH /api/schedule/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) }), params);
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({}) }), params);
    expect(res.status).toBe(403);
  });

  it('returns 404 when session not found', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one', startTime: '10:00' }),
    }), params);
    expect(res.status).toBe(404);
  });

  it('scope=one calls updateOne', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: null, date: new Date() });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    const res = await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one', startTime: '10:00' }),
    }), params);
    expect(res.status).toBe(200);
    expect(mockRepo.updateOne).toHaveBeenCalledWith('sess1', { startTime: '10:00' });
  });

  it('scope=future calls updateFuture', async () => {
    const date = new Date('2026-05-05');
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'future', startTime: '10:00' }),
    }), params);
    expect(mockRepo.updateFuture).toHaveBeenCalledWith('sid1', date, { startTime: '10:00' });
  });

  it('scope=all calls updateAll', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date: new Date() });
    const { PATCH } = await import('@/app/api/schedule/[id]/route');
    await PATCH(new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'all', startTime: '10:00' }),
    }), params);
    expect(mockRepo.updateAll).toHaveBeenCalledWith('sid1', { startTime: '10:00' });
  });
});

describe('DELETE /api/schedule/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scope=one calls cancelOne', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: null, date: new Date() });
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    const res = await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'one' }),
    }), params);
    expect(res.status).toBe(200);
    expect(mockRepo.cancelOne).toHaveBeenCalledWith('sess1');
  });

  it('scope=future calls cancelFuture', async () => {
    const date = new Date('2026-05-05');
    mockAuth.mockResolvedValue(makeSession('trainer', 't1'));
    mockRepo.findById.mockResolvedValue({ _id: 'sess1', trainerId: { toString: () => 't1' }, seriesId: { toString: () => 'sid1' }, date });
    const { DELETE } = await import('@/app/api/schedule/[id]/route');
    await DELETE(new Request('http://localhost', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'future' }),
    }), params);
    expect(mockRepo.cancelFuture).toHaveBeenCalledWith('sid1', date);
  });
});
