/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

const mockFind = jest.fn();
jest.mock('@/lib/db/models/nutrition-daily-log.model', () => ({
  NutritionDailyLogModel: { find: mockFind },
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeSession(role: string, id = 'u1') {
  return { user: { role, id } } as unknown as Awaited<ReturnType<typeof auth>>;
}

function makeChain(logs: unknown[]) {
  return {
    sort: jest.fn().mockResolvedValue(logs),
  };
}

const MEMBER_ID = '6600000000000000000000a1';
const TRAINER_ID = 'u-trainer';
const OTHER_MEMBER_ID = '6600000000000000000000a2';

function makeMemberDoc(trainerId: string) {
  return { _id: MEMBER_ID, trainerId: { toString: () => trainerId } };
}

function makeLog(date: string, items: Array<{ foodName: string; quantityG: number; kcal: number; protein: number; carbs: number; fat: number }>) {
  return {
    date,
    meals: [
      {
        name: 'Breakfast',
        order: 1,
        completed: false,
        items,
      },
    ],
  };
}

describe('GET /api/members/[memberId]/nutrition/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when member views another member', async () => {
    mockAuth.mockResolvedValue(makeSession('member', OTHER_MEMBER_ID));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 when trainer requests member not in their roster', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', TRAINER_ID));
    mockUserRepo.findById.mockResolvedValue(makeMemberDoc('other-trainer'));
    mockFind.mockReturnValue(makeChain([]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 for owner (always allowed)', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'owner-id'));
    mockFind.mockReturnValue(makeChain([]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { recent: unknown[] };
    expect(body.recent).toEqual([]);
  });

  it('returns 200 for trainer of the member', async () => {
    mockAuth.mockResolvedValue(makeSession('trainer', TRAINER_ID));
    mockUserRepo.findById.mockResolvedValue(makeMemberDoc(TRAINER_ID));
    mockFind.mockReturnValue(makeChain([]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 200 for member viewing their own data', async () => {
    mockAuth.mockResolvedValue(makeSession('member', MEMBER_ID));
    mockFind.mockReturnValue(makeChain([]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(200);
  });

  it('returns distinct items by foodName (deduplicates)', async () => {
    mockAuth.mockResolvedValue(makeSession('member', MEMBER_ID));
    const log1 = makeLog('2026-05-06', [
      { foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 55, fat: 5 },
      { foodName: 'Banana', quantityG: 120, kcal: 100, protein: 1, carbs: 25, fat: 0 },
    ]);
    const log2 = makeLog('2026-05-05', [
      { foodName: 'Oats', quantityG: 80, kcal: 300, protein: 10, carbs: 55, fat: 5 }, // duplicate
      { foodName: 'Eggs', quantityG: 100, kcal: 150, protein: 13, carbs: 1, fat: 10 },
    ]);
    mockFind.mockReturnValue(makeChain([log1, log2]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    const body = await res.json() as { recent: Array<{ foodName: string }> };
    const names = body.recent.map((i) => i.foodName);
    expect(names).toEqual(['Oats', 'Banana', 'Eggs']);
  });

  it('sorts items by latest log date desc (first log first)', async () => {
    mockAuth.mockResolvedValue(makeSession('member', MEMBER_ID));
    // The find().sort({ date: -1 }) mock returns logs newest-first already;
    // we just verify the first item in response belongs to the newest log.
    const newerLog = makeLog('2026-05-06', [
      { foodName: 'Chicken', quantityG: 200, kcal: 300, protein: 50, carbs: 0, fat: 8 },
    ]);
    const olderLog = makeLog('2026-05-05', [
      { foodName: 'Rice', quantityG: 150, kcal: 200, protein: 4, carbs: 45, fat: 1 },
    ]);
    mockFind.mockReturnValue(makeChain([newerLog, olderLog]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    const body = await res.json() as { recent: Array<{ foodName: string }> };
    expect(body.recent[0].foodName).toBe('Chicken');
    expect(body.recent[1].foodName).toBe('Rice');
  });

  it('caps results at 20 distinct items', async () => {
    mockAuth.mockResolvedValue(makeSession('member', MEMBER_ID));
    // Build one log with 25 distinct food items
    const items = Array.from({ length: 25 }, (_, i) => ({
      foodName: `Food${i}`,
      quantityG: 100,
      kcal: 100,
      protein: 5,
      carbs: 15,
      fat: 3,
    }));
    const log = makeLog('2026-05-06', items);
    mockFind.mockReturnValue(makeChain([log]));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    const body = await res.json() as { recent: unknown[] };
    expect(body.recent).toHaveLength(20);
  });

  it('returns 400 for invalid memberId', async () => {
    mockAuth.mockResolvedValue(makeSession('owner', 'owner-id'));
    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: 'not-an-object-id' }),
    });
    expect(res.status).toBe(400);
  });

  it('excludes logs older than 30 days', async () => {
    mockAuth.mockResolvedValue(makeSession('member', MEMBER_ID));

    const oldDate = new Date();
    oldDate.setUTCDate(oldDate.getUTCDate() - 60);
    const oldISO = oldDate.toISOString().slice(0, 10);

    const recentDate = new Date();
    recentDate.setUTCDate(recentDate.getUTCDate() - 5);
    const recentISO = recentDate.toISOString().slice(0, 10);

    mockFind.mockImplementation((filter: { date?: { $gte?: string } }) => {
      expect(filter.date?.$gte).toBeDefined();
      const cutoff = filter.date!.$gte!;
      // cutoff should be between 60 days ago and 5 days ago (i.e. ~30 days ago)
      expect(cutoff < recentISO).toBe(true);
      expect(cutoff > oldISO).toBe(true);
      return { sort: jest.fn().mockResolvedValue([]) };
    });

    const { GET } = await import('@/app/api/members/[memberId]/nutrition/recent/route');
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ memberId: MEMBER_ID }),
    });
    expect(res.status).toBe(200);
  });
});
