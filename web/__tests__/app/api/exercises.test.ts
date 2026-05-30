/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockExerciseRepo = {
  findAll: jest.fn(),
  create: jest.fn(),
};
jest.mock('@/lib/repositories/exercise.repository', () => ({
  MongoExerciseRepository: jest.fn(() => mockExerciseRepo),
}));

const mockUserRepo = {
  findById: jest.fn(),
};
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/exercises', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/exercises/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns exercises for trainer (global + own)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const exercises = [{ name: 'Bench' }, { name: 'Squat' }];
    mockExerciseRepo.findAll.mockResolvedValue(exercises);

    const { GET } = await import('@/app/api/exercises/route');
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockExerciseRepo.findAll).toHaveBeenCalledWith({ creatorId: 't1' });
    expect(data).toEqual(exercises);
  });

  it('returns exercises for member using their trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 'trainer1' } } as never);
    mockExerciseRepo.findAll.mockResolvedValue([]);

    const { GET } = await import('@/app/api/exercises/route');
    await GET();

    expect(mockExerciseRepo.findAll).toHaveBeenCalledWith({ creatorId: 'trainer1' });
  });
});

describe('POST /api/exercises', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to create', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: null } } as never);
    const { POST } = await import('@/app/api/exercises/route');
    const res = await POST(new Request('http://localhost/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', isBodyweight: false }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates exercise for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const created = { _id: 'e1', name: 'Custom Curl' };
    mockExerciseRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/exercises/route');
    const res = await POST(new Request('http://localhost/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Custom Curl', muscleGroup: 'Biceps', isBodyweight: false }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockExerciseRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Custom Curl',
      isGlobal: false,
      createdBy: 't1',
    }));
  });

  it('creates exercise with equipmentIds when provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const created = { _id: 'ex1', name: 'Smith Squat', equipmentIds: ['e1'] };
    mockExerciseRepo.create.mockResolvedValue(created as never);

    const { POST } = await import('@/app/api/exercises/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Smith Squat', equipmentIds: ['e1'] }),
      }),
    );
    expect(res.status).toBe(201);
    expect(mockExerciseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentIds: ['e1'] }),
    );
  });

  it('creates exercise with empty equipmentIds when not provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    mockExerciseRepo.create.mockResolvedValue({ _id: 'ex2', name: 'Push-up' } as never);

    const { POST } = await import('@/app/api/exercises/route');
    await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Push-up' }),
      }),
    );
    expect(mockExerciseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentIds: [] }),
    );
  });
});
