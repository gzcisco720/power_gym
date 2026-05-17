/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockBodyTestRepo = { findAllByMemberAscending: jest.fn() };
jest.mock('@/lib/repositories/body-test.repository', () => ({
  MongoBodyTestRepository: jest.fn(() => mockBodyTestRepo),
}));

const mockCheckInRepo = { findPhotosForMember: jest.fn() };
jest.mock('@/lib/repositories/check-in.repository', () => ({
  MongoCheckInRepository: jest.fn(() => mockCheckInRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

type RouteContext = { params: Promise<{ memberId: string }> };

describe('GET /api/members/[memberId]/journey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when member accesses another member data', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'other', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when a trainer tries to access this member-only endpoint', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(403);
  });

  it('returns empty items and null summary when member has no body tests', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(0);
    expect(data.summary).toBeNull();
    expect(data.nextCursor).toBeNull();
  });

  it('returns items with summary when member has body tests', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([
      { _id: { toString: () => 'bt1' }, date: new Date('2024-01-01'), bodyFatPct: 24.0, weight: 76.0, leanMassKg: 57.6, fatMassKg: 18.4, targetBodyFatPct: null, targetWeight: null },
      { _id: { toString: () => 'bt2' }, date: new Date('2024-03-01'), bodyFatPct: 22.0, weight: 74.0, leanMassKg: 57.7, fatMassKg: 16.3, targetBodyFatPct: null, targetWeight: null },
    ]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.totalTests).toBe(2);
    expect(data.summary.firstBodyFatPct).toBe(24.0);
    expect(data.summary.latestBodyFatPct).toBe(22.0);
    expect(data.items).toHaveLength(2);
    // newest first
    expect(data.items[0].bodyTest.bodyFatPct).toBe(22.0);
    expect(data.items[0].bodyTest.testNumber).toBe(2);
    expect(data.items[1].bodyTest.testNumber).toBe(1);
  });

  it('first item is marked as milestone (time_milestone: first test)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue([
      { _id: { toString: () => 'bt1' }, date: new Date('2024-01-01'), bodyFatPct: 24.0, weight: 76.0, leanMassKg: 57.6, fatMassKg: 18.4, targetBodyFatPct: null, targetWeight: null },
    ]);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    const data = await res.json();
    expect(data.items[0].milestone).not.toBeNull();
    expect(data.items[0].milestone.emoji).toBe('🌟');
  });

  it('respects cursor pagination', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const tests = Array.from({ length: 15 }, (_, i) => ({
      _id: { toString: () => `bt${i}` },
      date: new Date(2024, 0, i + 1),
      bodyFatPct: 24.0 - i * 0.1,
      weight: 76.0 - i * 0.2,
      leanMassKg: 57.6 + i * 0.05,
      fatMassKg: 18.4 - i * 0.1,
      targetBodyFatPct: null,
      targetWeight: null,
    }));
    mockBodyTestRepo.findAllByMemberAscending.mockResolvedValue(tests);
    mockCheckInRepo.findPhotosForMember.mockResolvedValue([]);
    const { GET } = await import('@/app/api/members/[memberId]/journey/route');
    const res = await GET(
      new Request('http://localhost/api/members/m1/journey?limit=10'),
      { params: Promise.resolve({ memberId: 'm1' }) } as RouteContext,
    );
    const data = await res.json();
    expect(data.items).toHaveLength(10);
    expect(data.nextCursor).not.toBeNull();
  });
});
