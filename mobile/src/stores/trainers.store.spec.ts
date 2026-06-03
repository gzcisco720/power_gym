jest.mock('../lib/api/trainers.api', () => ({
  fetchTrainers: jest.fn(),
  fetchTrainerDetail: jest.fn(),
}));

import * as trainersApi from '../lib/api/trainers.api';
import { useTrainersStore } from './trainers.store';
import { TrainerListItem, TrainerDetail } from '../types/trainers';

const mockFetchTrainers = trainersApi.fetchTrainers as jest.MockedFunction<
  typeof trainersApi.fetchTrainers
>;
const mockFetchTrainerDetail = trainersApi.fetchTrainerDetail as jest.MockedFunction<
  typeof trainersApi.fetchTrainerDetail
>;

const MOCK_TRAINER: TrainerListItem = {
  id: 'tr1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  memberCount: 2,
};

const MOCK_DETAIL: TrainerDetail = {
  id: 'tr1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  memberCount: 2,
  joinDate: '2023-01-15T00:00:00.000Z',
  members: [
    { id: 'm1', name: 'Bob Jones', email: 'bob@example.com' },
    { id: 'm2', name: 'Carol White', email: 'carol@example.com' },
  ],
};

function resetStore() {
  useTrainersStore.setState({
    trainers: [],
    loading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useTrainersStore', () => {
  describe('fetchTrainers', () => {
    it('populates trainers and sets loading false on success', async () => {
      mockFetchTrainers.mockResolvedValueOnce([MOCK_TRAINER]);

      await useTrainersStore.getState().fetchTrainers();

      const state = useTrainersStore.getState();
      expect(state.trainers).toEqual([MOCK_TRAINER]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error message and loading false on failure', async () => {
      mockFetchTrainers.mockRejectedValueOnce(new Error('Network error'));

      await useTrainersStore.getState().fetchTrainers();

      const state = useTrainersStore.getState();
      expect(state.trainers).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('fetchTrainerDetail', () => {
    it('populates detail and clears detailLoading on success', async () => {
      mockFetchTrainerDetail.mockResolvedValueOnce(MOCK_DETAIL);

      await useTrainersStore.getState().fetchTrainerDetail('tr1');

      const state = useTrainersStore.getState();
      expect(state.detail).toEqual(MOCK_DETAIL);
      expect(state.detailLoading).toBe(false);
      expect(state.detailError).toBeNull();
    });

    it('sets detailError and clears detailLoading on failure', async () => {
      mockFetchTrainerDetail.mockRejectedValueOnce(new Error('Not found'));

      await useTrainersStore.getState().fetchTrainerDetail('tr1');

      const state = useTrainersStore.getState();
      expect(state.detail).toBeNull();
      expect(state.detailLoading).toBe(false);
      expect(state.detailError).toBe('Not found');
    });
  });
});
