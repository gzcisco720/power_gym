/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockEquipmentRepo = { findAll: jest.fn(), create: jest.fn() };
jest.mock('@/lib/repositories/equipment.repository', () => ({
  MongoEquipmentRepository: jest.fn(() => mockEquipmentRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/owner/equipment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/owner/equipment/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/owner/equipment/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns equipment list for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const items = [{ _id: 'e1', name: 'Barbell', status: 'active', brand: null, quantity: 1, images: [], note: null }];
    mockEquipmentRepo.findAll.mockResolvedValue(items);
    const { GET } = await import('@/app/api/owner/equipment/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(items);
  });

  it('returns equipment list for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findAll.mockResolvedValue([]);
    const { GET } = await import('@/app/api/owner/equipment/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe('POST /api/owner/equipment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/owner/equipment/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to POST', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/owner/equipment/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(403);
  });

  it('creates equipment and returns 201 for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const created = { _id: 'e1', name: 'Smith Machine', status: 'active', brand: 'Matrix', quantity: 1, images: [], note: null };
    mockEquipmentRepo.create.mockResolvedValue(created);
    const { POST } = await import('@/app/api/owner/equipment/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Smith Machine', brand: 'Matrix' }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).name).toBe('Smith Machine');
  });

  it('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const { POST } = await import('@/app/api/owner/equipment/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: 'Nike' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
