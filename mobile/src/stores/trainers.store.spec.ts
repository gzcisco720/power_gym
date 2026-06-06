jest.mock('../lib/api/trainers.api', () => ({
  fetchTrainers: jest.fn(),
  fetchTrainerDetail: jest.fn(),
  fetchTrainerMembers: jest.fn(),
  fetchTrainerSessions: jest.fn(),
  fetchTrainerTrainingPlans: jest.fn(),
  fetchTrainerNutritionPlans: jest.fn(),
  reassignMember: jest.fn(),
}));

import * as trainersApi from '../lib/api/trainers.api';
import { useTrainersStore } from './trainers.store';
import { TrainerListItem, TrainerDetail, TrainerMemberMetrics, TrainerSessionItem, TrainerTemplateItem } from '../types/trainers';

const mockFetchTrainers = trainersApi.fetchTrainers as jest.MockedFunction<
  typeof trainersApi.fetchTrainers
>;
const mockFetchTrainerDetail = trainersApi.fetchTrainerDetail as jest.MockedFunction<
  typeof trainersApi.fetchTrainerDetail
>;
const mockFetchTrainerMembers = trainersApi.fetchTrainerMembers as jest.MockedFunction<
  typeof trainersApi.fetchTrainerMembers
>;
const mockFetchTrainerSessions = trainersApi.fetchTrainerSessions as jest.MockedFunction<
  typeof trainersApi.fetchTrainerSessions
>;
const mockFetchTrainerTrainingPlans = trainersApi.fetchTrainerTrainingPlans as jest.MockedFunction<
  typeof trainersApi.fetchTrainerTrainingPlans
>;
const mockFetchTrainerNutritionPlans = trainersApi.fetchTrainerNutritionPlans as jest.MockedFunction<
  typeof trainersApi.fetchTrainerNutritionPlans
>;
const mockReassignMember = trainersApi.reassignMember as jest.MockedFunction<
  typeof trainersApi.reassignMember
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

const MOCK_MEMBER_METRICS: TrainerMemberMetrics[] = [
  { id: 'm1', name: 'Bob Jones', email: 'bob@example.com', streak: 5, sessionsThisMonth: 12, status: 'active' },
  { id: 'm2', name: 'Carol White', email: 'carol@example.com', streak: 0, sessionsThisMonth: 3, status: 'needs-attn' },
];

const MOCK_SESSIONS: TrainerSessionItem[] = [
  {
    id: 'sess1',
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    memberNames: ['Bob Jones'],
    serviceTypeName: 'Personal Training',
    status: 'scheduled',
  },
];

const MOCK_TRAINING_PLANS: TrainerTemplateItem[] = [
  { id: 'tp1', name: 'Strength Plan', dayCount: 4, createdAt: '2026-01-01T00:00:00.000Z' },
];

const MOCK_NUTRITION_PLANS: TrainerTemplateItem[] = [
  { id: 'np1', name: 'Cut Diet', dayCount: 7, createdAt: '2026-01-02T00:00:00.000Z' },
];

function resetStore() {
  useTrainersStore.setState({
    trainers: [],
    loading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    trainerMembers: [],
    trainerMembersLoading: false,
    trainerMembersError: null,
    trainerSessions: [],
    trainerSessionsLoading: false,
    trainerSessionsError: null,
    trainerTrainingPlans: [],
    trainerTrainingPlansLoading: false,
    trainerTrainingPlansError: null,
    trainerNutritionPlans: [],
    trainerNutritionPlansLoading: false,
    trainerNutritionPlansError: null,
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

  describe('fetchTrainerMembers', () => {
    it('populates trainerMembers with metrics and clears loading on success', async () => {
      mockFetchTrainerMembers.mockResolvedValueOnce(MOCK_MEMBER_METRICS);

      await useTrainersStore.getState().fetchTrainerMembers('tr1');

      const state = useTrainersStore.getState();
      expect(state.trainerMembers).toEqual(MOCK_MEMBER_METRICS);
      expect(state.trainerMembersLoading).toBe(false);
      expect(state.trainerMembersError).toBeNull();
    });

    it('sets trainerMembersError on failure', async () => {
      mockFetchTrainerMembers.mockRejectedValueOnce(new Error('Server error'));

      await useTrainersStore.getState().fetchTrainerMembers('tr1');

      const state = useTrainersStore.getState();
      expect(state.trainerMembers).toEqual([]);
      expect(state.trainerMembersLoading).toBe(false);
      expect(state.trainerMembersError).toBe('Server error');
    });
  });

  describe('fetchTrainerSessions', () => {
    it('populates trainerSessions on success', async () => {
      mockFetchTrainerSessions.mockResolvedValueOnce(MOCK_SESSIONS);

      await useTrainersStore.getState().fetchTrainerSessions('tr1');

      const state = useTrainersStore.getState();
      expect(state.trainerSessions).toEqual(MOCK_SESSIONS);
      expect(state.trainerSessionsLoading).toBe(false);
      expect(state.trainerSessionsError).toBeNull();
    });
  });

  describe('fetchTrainerTrainingPlans', () => {
    it('populates trainerTrainingPlans on success', async () => {
      mockFetchTrainerTrainingPlans.mockResolvedValueOnce(MOCK_TRAINING_PLANS);

      await useTrainersStore.getState().fetchTrainerTrainingPlans('tr1');

      const state = useTrainersStore.getState();
      expect(state.trainerTrainingPlans).toEqual(MOCK_TRAINING_PLANS);
      expect(state.trainerTrainingPlansLoading).toBe(false);
      expect(state.trainerTrainingPlansError).toBeNull();
    });
  });

  describe('fetchTrainerNutritionPlans', () => {
    it('populates trainerNutritionPlans on success', async () => {
      mockFetchTrainerNutritionPlans.mockResolvedValueOnce(MOCK_NUTRITION_PLANS);

      await useTrainersStore.getState().fetchTrainerNutritionPlans('tr1');

      const state = useTrainersStore.getState();
      expect(state.trainerNutritionPlans).toEqual(MOCK_NUTRITION_PLANS);
      expect(state.trainerNutritionPlansLoading).toBe(false);
      expect(state.trainerNutritionPlansError).toBeNull();
    });
  });

  describe('reassignMember', () => {
    it('calls the api with member and target trainer ids and refreshes the members list', async () => {
      mockReassignMember.mockResolvedValueOnce(undefined);
      mockFetchTrainerMembers.mockResolvedValueOnce([]);

      await useTrainersStore.getState().reassignMember('tr1', 'm1', 'tr2');

      expect(mockReassignMember).toHaveBeenCalledWith('tr1', 'm1', 'tr2');
      expect(mockFetchTrainerMembers).toHaveBeenCalledWith('tr1');
    });
  });
});
