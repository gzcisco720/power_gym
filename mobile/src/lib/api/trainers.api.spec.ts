jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from './client';
import { fetchTrainers, fetchTrainerDetail } from './trainers.api';
import { TrainerListItem, TrainerDetail } from '../../types/trainers';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const MOCK_TRAINER: TrainerListItem = {
  id: 'tr1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  memberCount: 3,
};

const MOCK_DETAIL: TrainerDetail = {
  id: 'tr1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  memberCount: 3,
  joinDate: '2023-01-15T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Bob Jones', email: 'bob@example.com' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('trainers.api', () => {
  describe('fetchTrainers', () => {
    it("calls apiClient.get('/trainers') and returns response.data", async () => {
      mockGet.mockResolvedValueOnce({ data: [MOCK_TRAINER] });

      const result = await fetchTrainers();

      expect(mockGet).toHaveBeenCalledWith('/trainers');
      expect(result).toEqual([MOCK_TRAINER]);
    });
  });

  describe('fetchTrainerDetail', () => {
    it("calls apiClient.get('/trainers/:id') with the given id and returns response.data", async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_DETAIL });

      const result = await fetchTrainerDetail('tr1');

      expect(mockGet).toHaveBeenCalledWith('/trainers/tr1');
      expect(result).toEqual(MOCK_DETAIL);
    });
  });
});
