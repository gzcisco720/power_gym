import { create } from 'zustand';
import { fetchInvites, createInvite, revokeInvite, resendInvite } from '@/api/invites';
import type { InviteListItem, CreateInvitePayload } from '@/api/invites';

interface InvitesState {
  invites: InviteListItem[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  createInvite: (payload: CreateInvitePayload) => Promise<{ inviteUrl: string }>;
  revokeInvite: (id: string) => Promise<void>;
  resendInvite: (id: string) => Promise<{ inviteUrl: string }>;
}

export const useInvitesStore = create<InvitesState>((set, get) => ({
  invites: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const invites = await fetchInvites();
      set({ invites, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  createInvite: async (payload: CreateInvitePayload) => {
    const result = await createInvite(payload);
    // Re-fetch to get the created invite with its server-assigned _id
    const fresh = await fetchInvites();
    // Prepend the newest (first in fresh that isn't already in current list)
    const existingIds = new Set(get().invites.map((i) => i._id));
    const newInvites = fresh.filter((i) => !existingIds.has(i._id));
    set({ invites: [...newInvites, ...get().invites] });
    return { inviteUrl: result.inviteUrl };
  },

  revokeInvite: async (id: string) => {
    await revokeInvite(id);
    set({ invites: get().invites.filter((inv) => inv._id !== id) });
  },

  resendInvite: async (id: string) => {
    return resendInvite(id);
  },
}));
