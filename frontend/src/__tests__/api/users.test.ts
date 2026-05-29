import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/client', () => ({
  request: vi.fn(),
  requestVoid: vi.fn(),
}));

import { request, requestVoid } from '@/api/client';
import {
  fetchOwnerMembers,
  fetchOwnerTrainers,
  fetchOwnerInvites,
  createInvite,
  assignTrainer,
  fetchOwnerStats,
  revokeOwnerInvite,
  fetchMembers,
  fetchMember,
} from '@/api/users';

const mockRequest = vi.mocked(request);
const mockRequestVoid = vi.mocked(requestVoid);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue(undefined);
  mockRequestVoid.mockResolvedValue(undefined);
});

describe('api/users', () => {
  it('fetchOwnerMembers calls GET /api/v1/owner/members', async () => {
    await fetchOwnerMembers();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/members');
  });

  it('fetchOwnerMembers appends trainerId query when provided', async () => {
    await fetchOwnerMembers('t1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/members?trainerId=t1');
  });

  it('fetchOwnerTrainers calls GET /api/v1/owner/trainers', async () => {
    await fetchOwnerTrainers();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/trainers');
  });

  it('fetchOwnerInvites calls GET /api/v1/owner/invites', async () => {
    await fetchOwnerInvites();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/invites');
  });

  it('createInvite calls POST /api/v1/invites with body', async () => {
    await createInvite({ recipientEmail: 'a@b.com', role: 'member' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/invites',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('assignTrainer calls PATCH /api/v1/owner/members/:id/trainer', async () => {
    await assignTrainer('m1', 't2');
    expect(mockRequestVoid).toHaveBeenCalledWith(
      '/api/v1/owner/members/m1/trainer',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('fetchOwnerStats calls GET /api/v1/owner/stats', async () => {
    await fetchOwnerStats();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/owner/stats');
  });

  it('revokeOwnerInvite calls DELETE /api/v1/owner/invites/:id', async () => {
    await revokeOwnerInvite('inv1');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/v1/owner/invites/inv1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('fetchMembers calls GET /api/v1/members', async () => {
    await fetchMembers();
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members');
  });

  it('fetchMember calls GET /api/v1/members/:id', async () => {
    await fetchMember('m1');
    expect(mockRequest).toHaveBeenCalledWith('/api/v1/members/m1');
  });
});
