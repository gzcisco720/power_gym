jest.mock('../lib/api/invites.api', () => ({
  fetchInvites: jest.fn(),
  fetchTrainerOptions: jest.fn(),
  createInvite: jest.fn(),
  revokeInvite: jest.fn(),
}));

import * as invitesApi from '../lib/api/invites.api';
import { useInvitesStore } from './invites.store';
import { Invite, TrainerOption } from '../types/invites';

const mockFetchInvites = invitesApi.fetchInvites as jest.MockedFunction<
  typeof invitesApi.fetchInvites
>;
const mockFetchTrainerOptions = invitesApi.fetchTrainerOptions as jest.MockedFunction<
  typeof invitesApi.fetchTrainerOptions
>;

const MOCK_INVITE_1: Invite = {
  _id: 'inv1',
  token: 'token-abc',
  role: 'member',
  recipientEmail: 'user1@example.com',
  expiresAt: '2099-01-01T00:00:00.000Z',
  usedAt: null,
  trainerId: 'trainer1',
  invitedBy: 'owner1',
};

const MOCK_INVITE_2: Invite = {
  _id: 'inv2',
  token: 'token-def',
  role: 'trainer',
  recipientEmail: 'trainer@example.com',
  expiresAt: '2099-02-01T00:00:00.000Z',
  usedAt: null,
  trainerId: null,
  invitedBy: 'owner1',
};

const MOCK_TRAINER: TrainerOption = {
  _id: 'trainer1',
  name: 'John Trainer',
};

function resetStore() {
  useInvitesStore.setState({
    items: [],
    trainers: [],
    loading: false,
    error: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useInvitesStore', () => {
  describe('fetchInvites', () => {
    it('populates items and sets loading false on success', async () => {
      mockFetchInvites.mockResolvedValueOnce([MOCK_INVITE_1, MOCK_INVITE_2]);

      await useInvitesStore.getState().fetchInvites();

      const state = useInvitesStore.getState();
      expect(state.items).toEqual([MOCK_INVITE_1, MOCK_INVITE_2]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error and loading false when the api rejects', async () => {
      mockFetchInvites.mockRejectedValueOnce(new Error('Network error'));

      await useInvitesStore.getState().fetchInvites();

      const state = useInvitesStore.getState();
      expect(state.items).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchTrainers', () => {
    it('populates trainers and sets loading false on success', async () => {
      mockFetchTrainerOptions.mockResolvedValueOnce([MOCK_TRAINER]);

      await useInvitesStore.getState().fetchTrainers();

      const state = useInvitesStore.getState();
      expect(state.trainers).toEqual([MOCK_TRAINER]);
      expect(state.loading).toBe(false);
    });
  });

  describe('addItem', () => {
    it('prepends the new invite to items', () => {
      useInvitesStore.setState({ items: [MOCK_INVITE_2] });

      useInvitesStore.getState().addItem(MOCK_INVITE_1);

      const state = useInvitesStore.getState();
      expect(state.items[0]).toEqual(MOCK_INVITE_1);
      expect(state.items[1]).toEqual(MOCK_INVITE_2);
      expect(state.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes the invite with the matching _id', () => {
      useInvitesStore.setState({ items: [MOCK_INVITE_1, MOCK_INVITE_2] });

      useInvitesStore.getState().removeItem('inv1');

      const state = useInvitesStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(MOCK_INVITE_2);
    });
  });
});
