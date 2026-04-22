/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockFoodRepo = { findAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/food.repository', () => ({
  MongoFoodRepository: jest.fn(() => mockFoodRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    expect(res.status).toBe(401);
  });

  it('returns foods for trainer (global + own)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer', trainerId: null } } as never);
    const foods = [{ name: '鸡胸肉' }];
    mockFoodRepo.findAll.mockResolvedValue(foods);

    const { GET } = await import('@/app/api/foods/route');
    const res = await GET(new Request('http://localhost/api/foods'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockFoodRepo.findAll).toHaveBeenCalledWith({ creatorId: 't1' });
    expect(data).toEqual(foods);
  });

  it('returns foods for member using trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member', trainerId: 'trainer1' } } as never);
    mockFoodRepo.findAll.mockResolvedValue([]);

    const { GET } = await import('@/app/api/foods/route');
    await GET(new Request('http://localhost/api/foods'));

    expect(mockFoodRepo.findAll).toHaveBeenCalledWith({ creatorId: 'trainer1' });
  });
});

describe('POST /api/foods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member tries to create', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(new Request('http://localhost/api/foods', {
      method: 'POST',
      body: JSON.stringify({ name: '燕麦', per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 } }),
    }));
    expect(res.status).toBe(403);
  });

  it('creates food for trainer and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const created = { _id: 'f1', name: '燕麦' };
    mockFoodRepo.create.mockResolvedValue(created);

    const { POST } = await import('@/app/api/foods/route');
    const res = await POST(new Request('http://localhost/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '燕麦',
        brand: null,
        per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 },
        perServing: null,
      }),
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(created);
    expect(mockFoodRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: '燕麦',
      isGlobal: false,
      createdBy: 't1',
    }));
  });
});
