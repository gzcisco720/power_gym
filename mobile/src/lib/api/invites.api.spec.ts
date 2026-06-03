jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from './client';
import {
  fetchInvites,
  fetchTrainerOptions,
  createInvite,
  revokeInvite,
} from './invites.api';
import { Invite, TrainerOption } from '../../types/invites';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const MOCK_INVITE: Invite = {
  _id: 'inv1',
  token: 'token-abc',
  role: 'member',
  recipientEmail: 'user@example.com',
  expiresAt: '2099-01-01T00:00:00.000Z',
  usedAt: null,
  trainerId: 'trainer1',
  invitedBy: 'owner1',
};

const MOCK_TRAINER: TrainerOption = {
  _id: 'trainer1',
  name: 'John Trainer',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('invites.api', () => {
  describe('fetchInvites', () => {
    it('calls apiClient.get("/invites") and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_INVITE] });

      const result = await fetchInvites();

      expect(mockGet).toHaveBeenCalledWith('/invites');
      expect(result).toEqual([MOCK_INVITE]);
    });
  });

  describe('fetchTrainerOptions', () => {
    it('calls apiClient.get("/invites/trainers") and returns response.data', async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_TRAINER] });

      const result = await fetchTrainerOptions();

      expect(mockGet).toHaveBeenCalledWith('/invites/trainers');
      expect(result).toEqual([MOCK_TRAINER]);
    });
  });

  describe('createInvite', () => {
    it('calls apiClient.post("/invites", dto) and returns response.data', async () => {
      const dto = { role: 'member' as const, recipientEmail: 'user@example.com', trainerId: 'trainer1' };
      mockPost.mockResolvedValueOnce({ data: MOCK_INVITE });

      const result = await createInvite(dto);

      expect(mockPost).toHaveBeenCalledWith('/invites', dto);
      expect(result).toEqual(MOCK_INVITE);
    });
  });

  describe('revokeInvite', () => {
    it('calls apiClient.delete("/invites/:id")', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await revokeInvite('inv1');

      expect(mockDelete).toHaveBeenCalledWith('/invites/inv1');
    });
  });
});
