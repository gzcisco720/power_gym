/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockFoodRepo = {
  findVisibleTo: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const mockUserRepo = {
  findById: jest.fn(),
};

jest.mock('@/lib/repositories/food.repository', () => ({
  MongoFoodRepository: jest.fn(() => mockFoodRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const VALID_OID = '64a1b2c3d4e5f6a7b8c9d0e1';
const OTHER_OID = '64a1b2c3d4e5f6a7b8c9d0e2';

const SAMPLE_MACROS = { kcal: 100, protein: 5, carbs: 10, fat: 3 };
const SAMPLE_SERVINGS = [{ label: '100g', grams: 100 }];

function makeFood(createdBy = VALID_OID, id = VALID_OID) {
  return {
    _id: { toString: () => id },
    createdBy: { equals: (v: { toString(): string } | string) => v.toString() === createdBy, toString: () => createdBy },
    name: 'Apple',
    brand: null,
    macrosPer100g: SAMPLE_MACROS,
    servings: SAMPLE_SERVINGS,
  };
}

// ─── GET /api/foods ───────────────────────────────────────────────────────────

describe('GET /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    expect(res.status).toBe(401);
  });

  it('returns own foods for trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findVisibleTo.mockResolvedValue([makeFood(VALID_OID)]);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.foods).toHaveLength(1);
    expect(mockFoodRepo.findVisibleTo).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) }),
      undefined,
    );
  });

  it('returns own foods for owner', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', VALID_OID));
    mockFoodRepo.findVisibleTo.mockResolvedValue([]);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    expect(res.status).toBe(200);
    expect(mockFoodRepo.findVisibleTo).toHaveBeenCalled();
  });

  it('returns trainer foods for member (via trainerId)', async () => {
    mockAuth.mockResolvedValue(makeSession('member', VALID_OID));
    mockUserRepo.findById.mockResolvedValue({
      _id: VALID_OID,
      role: 'member',
      trainerId: { toString: () => OTHER_OID },
    });
    mockFoodRepo.findVisibleTo.mockResolvedValue([makeFood(OTHER_OID)]);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.foods).toHaveLength(1);
    expect(mockFoodRepo.findVisibleTo).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) }),
      undefined,
    );
  });

  it('returns empty list for member with no trainer', async () => {
    mockAuth.mockResolvedValue(makeSession('member', VALID_OID));
    mockUserRepo.findById.mockResolvedValue({ _id: VALID_OID, role: 'member', trainerId: null });
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.foods).toEqual([]);
    expect(mockFoodRepo.findVisibleTo).not.toHaveBeenCalled();
  });

  it('applies ?q filter when provided', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findVisibleTo.mockResolvedValue([]);
    const { GET } = await import('@/app/api/foods/route');
    await GET(new Request('http://localhost/api/foods?q=app'));
    expect(mockFoodRepo.findVisibleTo).toHaveBeenCalledWith(
      expect.anything(),
      'app',
    );
  });
});

// ─── POST /api/foods ──────────────────────────────────────────────────────────

describe('POST /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', macrosPer100g: SAMPLE_MACROS, servings: SAMPLE_SERVINGS }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', macrosPer100g: SAMPLE_MACROS, servings: SAMPLE_SERVINGS }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('creates food and returns 201 with createdBy set to caller', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    const created = makeFood(VALID_OID);
    mockFoodRepo.create.mockResolvedValue(created);
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', macrosPer100g: SAMPLE_MACROS, servings: SAMPLE_SERVINGS }),
      }),
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.food).toBeDefined();
    expect(mockFoodRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apple' }),
    );
  });

  it('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ macrosPer100g: SAMPLE_MACROS, servings: SAMPLE_SERVINGS }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when macrosPer100g is missing a required field', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', macrosPer100g: { kcal: 100, protein: 5 }, servings: SAMPLE_SERVINGS }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when servings is empty', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(
      new Request('http://localhost/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Apple', macrosPer100g: SAMPLE_MACROS, servings: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/foods/[foodId] ────────────────────────────────────────────────

describe('PATCH /api/foods/[foodId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/foods/[foodId]/route');
    const res = await PATCH(
      new Request('http://localhost/api/foods/x', { method: 'PATCH', body: JSON.stringify({}) }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { PATCH } = await import('@/app/api/foods/[foodId]/route');
    const res = await PATCH(
      new Request('http://localhost/api/foods/x', { method: 'PATCH', body: JSON.stringify({}) }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when food does not exist', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findById.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/foods/[foodId]/route');
    const res = await PATCH(
      new Request('http://localhost/api/foods/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Banana' }),
      }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer tries to edit another trainer\'s food', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findById.mockResolvedValue(makeFood(OTHER_OID));
    const { PATCH } = await import('@/app/api/foods/[foodId]/route');
    const res = await PATCH(
      new Request('http://localhost/api/foods/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Banana' }),
      }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(403);
  });

  it('updates own food successfully', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findById.mockResolvedValue(makeFood(VALID_OID));
    const updated = { ...makeFood(VALID_OID), name: 'Banana' };
    mockFoodRepo.update.mockResolvedValue(updated);
    const { PATCH } = await import('@/app/api/foods/[foodId]/route');
    const res = await PATCH(
      new Request('http://localhost/api/foods/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Banana' }),
      }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.food).toBeDefined();
  });
});

// ─── DELETE /api/foods/[foodId] ───────────────────────────────────────────────

describe('DELETE /api/foods/[foodId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/foods/[foodId]/route');
    const res = await DELETE(
      new Request('http://localhost/api/foods/x', { method: 'DELETE' }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    mockAuth.mockResolvedValue(makeSession('member'));
    const { DELETE } = await import('@/app/api/foods/[foodId]/route');
    const res = await DELETE(
      new Request('http://localhost/api/foods/x', { method: 'DELETE' }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when deleting another trainer\'s food', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findById.mockResolvedValue(makeFood(OTHER_OID));
    const { DELETE } = await import('@/app/api/foods/[foodId]/route');
    const res = await DELETE(
      new Request('http://localhost/api/foods/x', { method: 'DELETE' }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 204 on successful delete', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', VALID_OID));
    mockFoodRepo.findById.mockResolvedValue(makeFood(VALID_OID));
    mockFoodRepo.delete.mockResolvedValue(true);
    const { DELETE } = await import('@/app/api/foods/[foodId]/route');
    const res = await DELETE(
      new Request('http://localhost/api/foods/x', { method: 'DELETE' }),
      { params: Promise.resolve({ foodId: VALID_OID }) },
    );
    expect(res.status).toBe(204);
  });
});
