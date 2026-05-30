import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/invites', () => ({
  fetchInvites: vi.fn(),
  createInvite: vi.fn(),
  revokeInvite: vi.fn(),
  resendInvite: vi.fn(),
}));

import { useInvitesStore } from './invitesStore';
import * as invitesApi from '@/api/invites';

const mockFetchInvites = vi.mocked(invitesApi.fetchInvites);
const mockCreateInvite = vi.mocked(invitesApi.createInvite);

describe('invitesStore', () => {
  beforeEach(() => {
    useInvitesStore.setState({
      invites: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('createInvite', () => {
    it('prepends new invite to list', async () => {
      const existingInvite = {
        _id: 'inv1',
        token: 'token1',
        role: 'member' as const,
        recipientEmail: 'old@test.com',
        expiresAt: new Date('2025-12-31').toISOString(),
        usedAt: null,
        trainerId: null,
      };
      useInvitesStore.setState({ invites: [existingInvite] });

      const newInvite = {
        _id: 'inv2',
        token: 'token2',
        role: 'member' as const,
        recipientEmail: 'new@test.com',
        expiresAt: new Date('2025-12-31').toISOString(),
        usedAt: null,
        trainerId: null,
      };
      mockCreateInvite.mockResolvedValue({ inviteUrl: 'http://test/register?token=token2' });
      mockFetchInvites.mockResolvedValue([newInvite, existingInvite]);

      await useInvitesStore.getState().createInvite({ email: 'new@test.com', role: 'member' });

      const state = useInvitesStore.getState();
      expect(state.invites[0]._id).toBe('inv2');
      expect(state.invites).toHaveLength(2);
    });
  });
});
