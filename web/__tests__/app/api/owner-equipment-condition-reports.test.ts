/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockEquipmentRepo = { findById: jest.fn() };
const mockReportRepo = { findByEquipmentId: jest.fn(), create: jest.fn() };

jest.mock('@/lib/repositories/equipment.repository', () => ({
  MongoEquipmentRepository: jest.fn(() => mockEquipmentRepo),
}));
jest.mock('@/lib/repositories/condition-report.repository', () => ({
  MongoConditionReportRepository: jest.fn(() => mockReportRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/owner/equipment/[id]/condition-reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when equipment not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(404);
  });

  it('returns reports for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findById.mockResolvedValue({ _id: 'e1', name: 'Treadmill' });
    const reports = [{ _id: 'r1', note: 'Belt worn', reportedAt: new Date().toISOString() }];
    mockReportRepo.findByEquipmentId.mockResolvedValue(reports);
    const { GET } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await GET(new Request('http://localhost/'), makeParams('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(reports);
  });
});

describe('POST /api/owner/equipment/[id]/condition-reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { POST } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }), makeParams('e1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { POST } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await POST(new Request('http://localhost/', { method: 'POST', body: '{}' }), makeParams('e1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when note is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const { POST } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),
      makeParams('e1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when equipment not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findById.mockResolvedValue(null);
    const { POST } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await POST(
      new Request('http://localhost/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'check' }) }),
      makeParams('e1'),
    );
    expect(res.status).toBe(404);
  });

  it('creates report with note and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockEquipmentRepo.findById.mockResolvedValue({ _id: 'e1', name: 'Treadmill' });
    const created = { _id: 'r1', equipmentId: 'e1', note: 'Belt worn', reportedAt: new Date() };
    mockReportRepo.create.mockResolvedValue(created);
    const { POST } = await import('@/app/api/owner/equipment/[id]/condition-reports/route');
    const res = await POST(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Belt worn' }),
      }),
      makeParams('e1'),
    );
    expect(res.status).toBe(201);
    expect(mockReportRepo.create).toHaveBeenCalledWith({ equipmentId: 'e1', note: 'Belt worn' });
  });
});
