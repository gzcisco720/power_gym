import { create } from 'zustand';
import { fetchMembers, reassignTrainer } from '@/api/members';
import { fetchTrainers } from '@/api/trainers';
import type { MemberListItem } from '@/api/members';
import type { TrainerListItem } from '@/api/trainers';

interface MembersState {
  members: MemberListItem[];
  trainers: TrainerListItem[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  reassign: (memberId: string, trainerId: string | null) => Promise<void>;
}

export const useMembersStore = create<MembersState>((set, get) => ({
  members: [],
  trainers: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const [members, trainers] = await Promise.all([fetchMembers(), fetchTrainers()]);
      set({ members, trainers, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  reassign: async (memberId: string, trainerId: string | null) => {
    // Optimistic update
    const prev = get().members;
    set({
      members: prev.map((m) => (m._id === memberId ? { ...m, trainerId } : m)),
    });

    try {
      await reassignTrainer(memberId, trainerId);
      // Confirm from server
      const fresh = await fetchMembers();
      set({ members: fresh });
    } catch (err) {
      // Rollback on failure
      set({ members: prev, error: err instanceof Error ? err.message : 'Unknown error' });
      throw err;
    }
  },
}));
