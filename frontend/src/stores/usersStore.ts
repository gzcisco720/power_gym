import { create } from 'zustand';
import * as usersApi from '@/api/users';

interface UsersState {
  members: usersApi.Member[];
  trainers: usersApi.Trainer[];
  invites: usersApi.Invite[];
  ownerStats: usersApi.OwnerStats | null;
  isLoading: boolean;
  error: string | null;
  fetchOwnerMembers: (trainerId?: string) => Promise<void>;
  fetchMembers: (trainerId?: string) => Promise<void>;
  fetchTrainers: () => Promise<void>;
  fetchOwnerInvites: () => Promise<void>;
  createInvite: (data: { recipientEmail: string; role: string; trainerId?: string }) => Promise<string>;
  assignTrainer: (memberId: string, trainerId: string | null) => Promise<void>;
  unassignTrainer: (memberId: string) => Promise<void>;
  fetchOwnerStats: () => Promise<void>;
  reset: () => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  members: [],
  trainers: [],
  invites: [],
  ownerStats: null,
  isLoading: false,
  error: null,

  fetchOwnerMembers: async (trainerId) => {
    set({ isLoading: true, error: null });
    try {
      const members = await usersApi.fetchOwnerMembers(trainerId);
      set({ members, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  fetchMembers: async (trainerId) => {
    set({ isLoading: true, error: null });
    try {
      const members = await usersApi.fetchMembers(trainerId);
      set({ members, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  fetchTrainers: async () => {
    try {
      const trainers = await usersApi.fetchOwnerTrainers();
      set({ trainers });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchOwnerInvites: async () => {
    try {
      const invites = await usersApi.fetchOwnerInvites();
      set({ invites });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createInvite: async (data) => {
    const result = await usersApi.createInvite(data);
    await get().fetchOwnerInvites();
    return result.token;
  },

  assignTrainer: async (memberId, trainerId) => {
    await usersApi.assignTrainer(memberId, trainerId);
    set((s) => ({
      members: s.members.map((m) => (m._id === memberId ? { ...m, trainerId } : m)),
    }));
  },

  unassignTrainer: async (memberId) => {
    await usersApi.assignTrainer(memberId, null);
    set((s) => ({
      members: s.members.map((m) => (m._id === memberId ? { ...m, trainerId: null } : m)),
    }));
  },

  fetchOwnerStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const ownerStats = await usersApi.fetchOwnerStats();
      set({ ownerStats, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  reset: () => set({ members: [], trainers: [], invites: [], ownerStats: null }),
}));
