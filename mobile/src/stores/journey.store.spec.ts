jest.mock('../lib/api/journey.api', () => ({
  fetchJourney: jest.fn(),
}));

import * as journeyApi from '../lib/api/journey.api';
import { useJourneyStore } from './journey.store';
import { JourneySummary } from '../types/journey';

const mockFetchJourney = journeyApi.fetchJourney as jest.MockedFunction<typeof journeyApi.fetchJourney>;

const MOCK_SUMMARY: JourneySummary = {
  workoutStreak: 3,
  recentSessions: [
    { _id: 'sess1', date: '2026-06-04T10:00:00.000Z', dayName: 'Push Day', completedSetCount: 6 },
    { _id: 'sess2', date: '2026-06-03T09:00:00.000Z', dayName: 'Pull Day', completedSetCount: 5 },
  ],
  nutritionDays: [
    { date: '2026-05-29', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-05-30', logged: true, loggedKcal: 2100, targetKcal: 2000, targetMet: true },
    { date: '2026-05-31', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
    { date: '2026-06-01', logged: true, loggedKcal: 1800, targetKcal: 2000, targetMet: false },
    { date: '2026-06-02', logged: true, loggedKcal: 2050, targetKcal: 2000, targetMet: true },
    { date: '2026-06-03', logged: true, loggedKcal: 2200, targetKcal: 2000, targetMet: true },
    { date: '2026-06-04', logged: false, loggedKcal: 0, targetKcal: 0, targetMet: false },
  ],
  bodyTests: [
    { _id: 'bt1', date: '2026-06-01T08:00:00.000Z', weight: 80.5, bodyFatPct: 15.2 },
  ],
};

function resetStore() {
  useJourneyStore.setState({ summary: null, loading: false, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useJourneyStore', () => {
  describe('initial state', () => {
    it('summary is null, loading is false, error is null', () => {
      const state = useJourneyStore.getState();
      expect(state.summary).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchJourney', () => {
    it('sets loading true while in flight then stores summary and clears loading on success', async () => {
      let resolveApi!: (value: JourneySummary) => void;
      const apiPromise = new Promise<JourneySummary>((res) => {
        resolveApi = res;
      });
      mockFetchJourney.mockReturnValueOnce(apiPromise);

      const fetchPromise = useJourneyStore.getState().fetchSummary();

      // loading should be true while the promise is in flight
      expect(useJourneyStore.getState().loading).toBe(true);

      resolveApi(MOCK_SUMMARY);
      await fetchPromise;

      const state = useJourneyStore.getState();
      expect(state.loading).toBe(false);
      expect(state.summary).toEqual(MOCK_SUMMARY);
      expect(state.error).toBeNull();
    });

    it('stores error message and clears loading when the api rejects', async () => {
      mockFetchJourney.mockRejectedValueOnce(new Error('Network error'));

      await useJourneyStore.getState().fetchSummary();

      const state = useJourneyStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('leaves summary null and error set after a failure (does not retain stale data on first load)', async () => {
      mockFetchJourney.mockRejectedValueOnce(new Error('Timeout'));

      await useJourneyStore.getState().fetchSummary();

      const state = useJourneyStore.getState();
      expect(state.summary).toBeNull();
      expect(state.error).toBe('Timeout');
    });
  });

  describe('integration: fetchJourney resolves and summary matches the returned JourneySummary', () => {
    it('summary deep-equals the JourneySummary returned by the mocked fetchJourney api function', async () => {
      mockFetchJourney.mockResolvedValueOnce(MOCK_SUMMARY);

      await useJourneyStore.getState().fetchSummary();

      const state = useJourneyStore.getState();
      expect(state.summary).toEqual(MOCK_SUMMARY);
      expect(state.error).toBeNull();
    });

    it('on rejection, summary stays null and error equals the rejected Error.message', async () => {
      mockFetchJourney.mockRejectedValueOnce(new Error('Server down'));

      await useJourneyStore.getState().fetchSummary();

      const state = useJourneyStore.getState();
      expect(state.summary).toBeNull();
      expect(state.error).toBe('Server down');
    });
  });
});
