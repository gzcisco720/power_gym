/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockInjuryRepo = {
  findById: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
};
jest.mock('@/lib/repositories/member-injury.repository', () => ({
  MongoMemberInjuryRepository: jest.fn(() => mockInjuryRepo),
}));

const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string, id: string) {
  return { params: Promise.resolve({ memberId, id }) };
}

describe('PATCH /api/members/[memberId]/injuries/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(new Request('http://localhost/', { method: 'PATCH', body: '{}' }), makeParams('m1', 'i1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member patches fields other than memberNotes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New title' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(403);
  });

  it('allows member to patch only memberNotes on own record', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const updated = { _id: 'i1', memberNotes: 'Hurts when bending' };
    mockInjuryRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm1' } });
    mockInjuryRepo.update.mockResolvedValue(updated);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNotes: 'Hurts when bending' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(200);
    expect(mockInjuryRepo.update).toHaveBeenCalledWith('i1', { memberNotes: 'Hurts when bending' });
  });

  it('returns 403 when member patches another member\'s record', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue({ memberId: { toString: () => 'm2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNotes: 'test' }),
      }),
      makeParams('m2', 'i1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when injury not found for member PATCH', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    mockInjuryRepo.findById.mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberNotes: 'test' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(404);
  });

  it('allows trainer to patch all fields for own member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const updated = { _id: 'i1', status: 'resolved' };
    mockInjuryRepo.update.mockResolvedValue(updated);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(200);
    expect(mockInjuryRepo.update).toHaveBeenCalledWith('i1', { status: 'resolved' });
  });

  it('returns 403 when trainer patches member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid JSON', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const { PATCH } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await PATCH(
      new Request('http://localhost/', { method: 'PATCH', body: 'bad' }),
      makeParams('m1', 'i1'),
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/members/[memberId]/injuries/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'i1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member tries to delete', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'i1'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when trainer deletes member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'i1'));
    expect(res.status).toBe(403);
  });

  it('returns 204 when trainer deletes own member\'s injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockInjuryRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'i1'));
    expect(res.status).toBe(204);
    expect(mockInjuryRepo.deleteById).toHaveBeenCalledWith('i1');
  });

  it('returns 204 when owner deletes any member\'s injury', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    mockInjuryRepo.deleteById.mockResolvedValue(undefined);
    const { DELETE } = await import('@/app/api/members/[memberId]/injuries/[id]/route');
    const res = await DELETE(new Request('http://localhost/'), makeParams('m1', 'i1'));
    expect(res.status).toBe(204);
  });
});
