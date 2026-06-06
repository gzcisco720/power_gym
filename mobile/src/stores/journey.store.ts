import { create } from 'zustand';
import {
  fetchJourney as apiFetchJourney,
  fetchJourneyTimeline as apiFetchTimeline,
} from '../lib/api/journey.api';
import { JourneySummary, JourneyTimelineItem } from '../types/journey';

interface JourneyState {
  summary: JourneySummary | null;
  loading: boolean;
  error: string | null;

  items: JourneyTimelineItem[];
  nextCursor: string | null;
  loadingMore: boolean;

  fetchSummary(): Promise<void>;
  fetchTimeline(): Promise<void>;
  fetchMore(): Promise<void>;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  summary: null,
  loading: false,
  error: null,

  items: [],
  nextCursor: null,
  loadingMore: false,

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

  async fetchTimeline(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const page = await apiFetchTimeline(null);
      set({ items: page.items, nextCursor: page.nextCursor, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async fetchMore(): Promise<void> {
    const { nextCursor, items, loadingMore } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true });
    try {
      const page = await apiFetchTimeline(nextCursor);
      set({
        items: [...items, ...page.items],
        nextCursor: page.nextCursor,
        loadingMore: false,
      });
    } catch {
      set({ loadingMore: false });
    }
  },
}));
