import { create } from 'zustand';
import {
  fetchTrainerInvites,
  createTrainerInvite,
  revokeTrainerInvite,
  resendTrainerInvite,
} from '@/api/trainer-invites';
import type { TrainerInviteListItem, CreateTrainerInvitePayload } from '@/api/trainer-invites';

interface TrainerInvitesState {
  invites: TrainerInviteListItem[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  createInvite: (payload: CreateTrainerInvitePayload) => Promise<{ inviteUrl: string }>;
  revokeInvite: (id: string) => Promise<void>;
  resendInvite: (id: string) => Promise<{ inviteUrl: string }>;
}

export const useTrainerInvitesStore = create<TrainerInvitesState>((set, get) => ({
  invites: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const invites = await fetchTrainerInvites();
      set({ invites, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  createInvite: async (payload: CreateTrainerInvitePayload) => {
    const result = await createTrainerInvite(payload);
    const fresh = await fetchTrainerInvites();
    const existingIds = new Set(get().invites.map((i) => i._id));
    const newInvites = fresh.filter((i) => !existingIds.has(i._id));
    set({ invites: [...newInvites, ...get().invites] });
    return { inviteUrl: result.inviteUrl };
  },

  revokeInvite: async (id: string) => {
    await revokeTrainerInvite(id);
    set({ invites: get().invites.filter((inv) => inv._id !== id) });
  },

  resendInvite: async (id: string) => {
    return resendTrainerInvite(id);
  },
}));
