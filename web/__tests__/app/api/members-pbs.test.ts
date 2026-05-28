/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockPBRepo = { findByMember: jest.fn() };
jest.mock('@/lib/repositories/personal-best.repository', () => ({
  MongoPersonalBestRepository: jest.fn(() => mockPBRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) { return { params: Promise.resolve({ memberId }) }; }

describe('GET /api/members/[memberId]/pbs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when member accesses another member PBs', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns PBs for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const pbs = [{ exerciseName: 'Bench Press', estimatedOneRM: 133 }];
    mockPBRepo.findByMember.mockResolvedValue(pbs);

    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(pbs);
  });

  it('allows trainer to read member PBs', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockPBRepo.findByMember.mockResolvedValue([]);

    const { GET } = await import('@/app/api/members/[memberId]/pbs/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});
