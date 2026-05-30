import { create } from 'zustand';
import { fetchJourney } from '@/api/member-portal';
import type { JourneyItem, JourneySummary } from '@/api/member-portal';

interface MemberJourneyState {
  items: JourneyItem[];
  summary: JourneySummary | null;
  nextCursor: string | null;
  isLoading: boolean;
  error: string | null;

  fetch: (memberId: string, cursor?: string) => Promise<void>;
  loadMore: (memberId: string) => Promise<void>;
}

export const useMemberJourneyStore = create<MemberJourneyState>((set, get) => ({
  items: [],
  summary: null,
  nextCursor: null,
  isLoading: false,
  error: null,

  fetch: async (memberId: string, cursor?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchJourney(memberId, cursor);
      set({
        items: data.items,
        summary: data.summary,
        nextCursor: data.nextCursor,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  loadMore: async (memberId: string) => {
    const { nextCursor, items } = get();
    if (!nextCursor) return;
    try {
      const data = await fetchJourney(memberId, nextCursor);
      set({
        items: [...items, ...data.items],
        nextCursor: data.nextCursor,
      });
    } catch {
      // silent — user can retry
    }
  },
}));
