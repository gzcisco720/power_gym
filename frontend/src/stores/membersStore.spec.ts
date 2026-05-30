import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API module before importing the store
vi.mock('@/api/members', () => ({
  fetchMembers: vi.fn(),
  reassignTrainer: vi.fn(),
  fetchTrainers: vi.fn(),
}));

import { useMembersStore } from './membersStore';
import * as membersApi from '@/api/members';

const mockFetchMembers = vi.mocked(membersApi.fetchMembers);
const mockReassignTrainer = vi.mocked(membersApi.reassignTrainer);

describe('membersStore', () => {
  beforeEach(() => {
    useMembersStore.setState({
      members: [],
      trainers: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('reassign', () => {
    it('optimistically updates the member trainer then confirms from server', async () => {
      const members = [
        { _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: 't1', createdAt: '2024-01-01T00:00:00.000Z' },
        { _id: 'm2', name: 'Bob', email: 'bob@test.com', trainerId: 't1', createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      useMembersStore.setState({ members });

      mockReassignTrainer.mockResolvedValue(undefined);
      mockFetchMembers.mockResolvedValue([
        { _id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: 't2', createdAt: '2024-01-01T00:00:00.000Z' },
        { _id: 'm2', name: 'Bob', email: 'bob@test.com', trainerId: 't1', createdAt: '2024-01-01T00:00:00.000Z' },
      ]);

      const reassignPromise = useMembersStore.getState().reassign('m1', 't2');

      // Optimistic update should be immediate
      expect(useMembersStore.getState().members[0].trainerId).toBe('t2');

      await reassignPromise;

      // Confirmed from server
      expect(useMembersStore.getState().members[0].trainerId).toBe('t2');
      expect(mockReassignTrainer).toHaveBeenCalledWith('m1', 't2');
    });
  });
});
