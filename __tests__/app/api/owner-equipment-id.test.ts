/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockEquipmentRepo = { findById: jest.fn(), update: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/equipment.repository', () => ({
  MongoEquipmentRepository: jest.fn(() => mockEquipmentRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/owner/equipment/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member calls GET', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when equipment not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(404);
  });

  it('returns equipment for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const item = { _id: 'e1', name: 'Barbell' };
    mockEquipmentRepo.findById.mockResolvedValue(item);
    const { GET } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(item);
  });

  it('returns equipment for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const item = { _id: 'e1', name: 'Barbell' };
    mockEquipmentRepo.findById.mockResolvedValue(item);
    const { GET } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/owner/equipment/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await PATCH(new Request('http://localhost/', { method: 'PATCH', body: '{}' }), makeParams('e1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to PATCH', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PATCH } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await PATCH(new Request('http://localhost/', { method: 'PATCH', body: '{}' }), makeParams('e1'));
    expect(res.status).toBe(403);
  });

  it('updates equipment and returns updated doc', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const updated = { _id: 'e1', name: 'Barbell', status: 'maintenance' };
    mockEquipmentRepo.update.mockResolvedValue(updated);
    const { PATCH } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'maintenance' }),
      }),
      makeParams('e1'),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('maintenance');
  });
});

describe('DELETE /api/owner/equipment/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to DELETE', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { DELETE } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(403);
  });

  it('deletes equipment and returns 204 for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/owner/equipment/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(204);
    expect(mockEquipmentRepo.deleteById).toHaveBeenCalledWith('e1');
  });
});
