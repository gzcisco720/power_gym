/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockMedRepo = { findById: jest.fn(), update: jest.fn(), deleteById: jest.fn() };
jest.mock('@/lib/repositories/member-medication.repository', () => ({
  MongoMemberMedicationRepository: jest.fn(() => mockMedRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, id: string) {
  return { params: Promise.resolve({ memberId, id }) };
}

describe('PATCH /api/members/[memberId]/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to patch', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when member patches another member medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 when member patches own medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm1' } });
    mockMedRepo.update.mockResolvedValue({ _id: 'med1', notes: 'updated' });
    const { PATCH } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify({ notes: 'updated' }) }),
      makeParams('m1', 'med1'),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/members/[memberId]/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when trainer tries to delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'med1'));
    expect(res.status).toBe(403);
  });

  it('returns 204 when member deletes own medication', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockMedRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm1' } });
    mockMedRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/members/[memberId]/medications/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'med1'));
    expect(res.status).toBe(204);
  });
});
