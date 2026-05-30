/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockNoteRepo = {
  findByMemberAndExercise: jest.fn(),
  appendEntry: jest.fn(),
  updateEntry: jest.fn(),
};
jest.mock('@/lib/repositories/exercise-note.repository', () => ({
  MongoExerciseNoteRepository: jest.fn(() => mockNoteRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/exercise-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when exerciseId missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when member accesses another member notes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m2&exerciseId=e1'));
    expect(res.status).toBe(403);
  });

  it('returns note document for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const note = { _id: 'n1', entries: [{ content: 'Good form' }] };
    mockNoteRepo.findByMemberAndExercise.mockResolvedValue(note);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(note);
  });

  it('returns null when no note exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockNoteRepo.findByMemberAndExercise.mockResolvedValue(null);
    const { GET } = await import('@/app/api/exercise-notes/route');
    const res = await GET(new Request('http://localhost/api/exercise-notes?memberId=m1&exerciseId=e1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toBeNull();
  });
});

describe('POST /api/exercise-notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to post', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/exercise-notes/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'm1', exerciseId: 'e1', exerciseName: 'Squat', content: 'test' }),
    }));
    expect(res.status).toBe(403);
  });

  it('appends note entry for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const updated = { _id: 'n1', entries: [{ content: 'Great form' }] };
    mockNoteRepo.appendEntry.mockResolvedValue(updated);
    const { POST } = await import('@/app/api/exercise-notes/route');
    const res = await POST(new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'm1', exerciseId: 'e1', exerciseName: 'Squat', content: 'Great form', sessionId: null }),
    }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data).toEqual(updated);
    expect(mockNoteRepo.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      memberId: 'm1', exerciseId: 'e1', trainerId: 't1', content: 'Great form',
    }));
  });
});

describe('PATCH /api/exercise-notes/[entryId]', () => {
  beforeEach(() => jest.clearAllMocks());

  function makeParams(entryId: string) {
    return { params: Promise.resolve({ entryId }) };
  }

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { PATCH } = await import('@/app/api/exercise-notes/[entryId]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ noteId: 'n1', content: 'Updated' }) }),
      makeParams('entry1'),
    );
    expect(res.status).toBe(403);
  });

  it('updates the note entry for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const updated = { _id: 'n1', entries: [{ _id: 'entry1', content: 'Updated note' }] };
    mockNoteRepo.updateEntry.mockResolvedValue(updated);

    const { PATCH } = await import('@/app/api/exercise-notes/[entryId]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: 'n1', content: 'Updated note' }),
      }),
      makeParams('entry1'),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
    expect(mockNoteRepo.updateEntry).toHaveBeenCalledWith('n1', 'entry1', 'Updated note');
  });
});
