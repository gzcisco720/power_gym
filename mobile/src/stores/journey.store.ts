import { create } from 'zustand';
import { fetchJourney as apiFetchJourney } from '../lib/api/journey.api';
import { JourneySummary } from '../types/journey';

interface JourneyState {
  summary: JourneySummary | null;
  loading: boolean;
  error: string | null;

  fetchSummary(): Promise<void>;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  summary: null,
  loading: false,
  error: null,

  async fetchSummary(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const summary = await apiFetchJourney();
      set({ summary, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },
}));
