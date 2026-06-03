import { create } from 'zustand';
import { fetchInvites, fetchTrainerOptions } from '../lib/api/invites.api';
import { Invite, TrainerOption } from '../types/invites';

interface InvitesState {
  items: Invite[];
  trainers: TrainerOption[];
  loading: boolean;
  error: string | null;
  fetchInvites(): Promise<void>;
  fetchTrainers(): Promise<void>;
  addItem(invite: Invite): void;
  removeItem(id: string): void;
}

export const useInvitesStore = create<InvitesState>((set) => ({
  items: [],
  trainers: [],
  loading: false,
  error: null,

  async fetchInvites(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const items = await fetchInvites();
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async fetchTrainers(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const trainers = await fetchTrainerOptions();
      set({ trainers, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  addItem(invite: Invite): void {
    set((state) => ({ items: [invite, ...state.items] }));
  },

  removeItem(id: string): void {
    set((state) => ({ items: state.items.filter((inv) => inv._id !== id) }));
  },
}));
