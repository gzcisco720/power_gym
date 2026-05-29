import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/users', () => ({
  fetchOwnerMembers: vi.fn(),
  fetchMembers: vi.fn(),
  fetchOwnerTrainers: vi.fn(),
  fetchOwnerInvites: vi.fn(),
  createInvite: vi.fn(),
  assignTrainer: vi.fn(),
  fetchOwnerStats: vi.fn(),
}));

import * as usersApi from '@/api/users';
import { useUsersStore } from '@/stores/usersStore';

const mockMember: usersApi.Member = {
  _id: 'm1',
  id: 'm1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'member',
  trainerId: 't1',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockTrainer: usersApi.Trainer = {
  _id: 't1',
  id: 't1',
  name: 'Bob',
  email: 'bob@test.com',
  role: 'trainer',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockInvite: usersApi.Invite = {
  _id: 'inv1',
  token: 'tok123',
  role: 'member',
  recipientEmail: 'new@test.com',
  expiresAt: '2026-12-31T00:00:00Z',
  usedAt: null,
  trainerId: 't1',
  invitedBy: 'o1',
};

const mockStats: usersApi.OwnerStats = {
  memberCount: 10,
  trainerCount: 3,
  pendingInviteCount: 1,
  membersByMonth: [],
};

beforeEach(() => {
  useUsersStore.setState({ members: [], trainers: [], invites: [], ownerStats: null, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('usersStore', () => {
  describe('fetchOwnerMembers', () => {
    it('populates members and clears isLoading on success', async () => {
      vi.mocked(usersApi.fetchOwnerMembers).mockResolvedValueOnce([mockMember]);

      await useUsersStore.getState().fetchOwnerMembers();

      const state = useUsersStore.getState();
      expect(state.members).toEqual([mockMember]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears isLoading on failure', async () => {
      vi.mocked(usersApi.fetchOwnerMembers).mockRejectedValueOnce(new Error('Network error'));

      await useUsersStore.getState().fetchOwnerMembers();

      const state = useUsersStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchMembers', () => {
    it('populates members and clears isLoading on success', async () => {
      vi.mocked(usersApi.fetchMembers).mockResolvedValueOnce([mockMember]);

      await useUsersStore.getState().fetchMembers();

      const state = useUsersStore.getState();
      expect(state.members).toEqual([mockMember]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and clears isLoading on failure', async () => {
      vi.mocked(usersApi.fetchMembers).mockRejectedValueOnce(new Error('Network error'));

      await useUsersStore.getState().fetchMembers();

      const state = useUsersStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchOwnerInvites', () => {
    it('populates the invites list', async () => {
      vi.mocked(usersApi.fetchOwnerInvites).mockResolvedValueOnce([mockInvite]);

      await useUsersStore.getState().fetchOwnerInvites();

      expect(useUsersStore.getState().invites).toEqual([mockInvite]);
    });
  });

  describe('fetchTrainers', () => {
    it('populates trainers list', async () => {
      vi.mocked(usersApi.fetchOwnerTrainers).mockResolvedValueOnce([mockTrainer]);

      await useUsersStore.getState().fetchTrainers();

      expect(useUsersStore.getState().trainers).toEqual([mockTrainer]);
    });
  });

  describe('createInvite', () => {
    it('appends the new invite to state and returns the invite token', async () => {
      vi.mocked(usersApi.createInvite).mockResolvedValueOnce({ token: 'tok123' });
      vi.mocked(usersApi.fetchOwnerInvites).mockResolvedValueOnce([mockInvite]);

      const token = await useUsersStore.getState().createInvite({ recipientEmail: 'new@test.com', role: 'member' });

      expect(token).toBe('tok123');
      expect(useUsersStore.getState().invites).toEqual([mockInvite]);
    });
  });

  describe('assignTrainer', () => {
    it("updates the member's trainerId in state", async () => {
      useUsersStore.setState({ members: [mockMember] });
      vi.mocked(usersApi.assignTrainer).mockResolvedValueOnce({ ...mockMember, trainerId: 't2' });

      await useUsersStore.getState().assignTrainer('m1', 't2');

      const updated = useUsersStore.getState().members.find((m) => m._id === 'm1');
      expect(updated?.trainerId).toBe('t2');
    });
  });

  describe('fetchOwnerStats', () => {
    it('populates ownerStats used by the dashboard', async () => {
      vi.mocked(usersApi.fetchOwnerStats).mockResolvedValueOnce(mockStats);

      await useUsersStore.getState().fetchOwnerStats();

      expect(useUsersStore.getState().ownerStats).toEqual(mockStats);
    });
  });

  describe('reset', () => {
    it('clears members, trainers, invites, ownerStats', async () => {
      useUsersStore.setState({ members: [mockMember], trainers: [mockTrainer], invites: [mockInvite], ownerStats: mockStats });

      useUsersStore.getState().reset();

      const state = useUsersStore.getState();
      expect(state.members).toEqual([]);
      expect(state.trainers).toEqual([]);
      expect(state.invites).toEqual([]);
      expect(state.ownerStats).toBeNull();
    });
  });
});
