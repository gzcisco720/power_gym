import { create } from 'zustand';
import {
  fetchMemberHealth,
  createInjury,
  updateInjury,
  deleteInjury,
} from '@/api/member-hub';
import type {
  SerializedInjury,
  SerializedMedication,
  SerializedMedicalHistory,
  InjuryPayload,
} from '@/api/member-hub';

interface MemberHealthState {
  injuries: SerializedInjury[];
  medications: SerializedMedication[];
  medicalHistory: SerializedMedicalHistory | null;
  isLoading: boolean;
  error: string | null;

  fetchHealth: (memberId: string) => Promise<void>;
  addInjury: (memberId: string, payload: InjuryPayload) => Promise<void>;
  updateInjury: (memberId: string, injuryId: string, payload: Partial<InjuryPayload> & { status?: 'active' | 'resolved'; memberNotes?: string | null }) => Promise<void>;
  removeInjury: (memberId: string, injuryId: string) => Promise<void>;
}

export const useMemberHealthStore = create<MemberHealthState>((set, get) => ({
  injuries: [],
  medications: [],
  medicalHistory: null,
  isLoading: false,
  error: null,

  fetchHealth: async (memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchMemberHealth(memberId);
      set({
        injuries: data.injuries,
        medications: data.medications,
        medicalHistory: data.medicalHistory,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  addInjury: async (memberId: string, payload: InjuryPayload) => {
    const created = await createInjury(memberId, payload);
    set({ injuries: [created, ...get().injuries] });
  },

  updateInjury: async (
    memberId: string,
    injuryId: string,
    payload: Partial<InjuryPayload> & { status?: 'active' | 'resolved'; memberNotes?: string | null },
  ) => {
    const updated = await updateInjury(memberId, injuryId, payload);
    set({
      injuries: get().injuries.map((i) => (i._id === injuryId ? updated : i)),
    });
  },

  removeInjury: async (memberId: string, injuryId: string) => {
    await deleteInjury(memberId, injuryId);
    set({ injuries: get().injuries.filter((i) => i._id !== injuryId) });
  },
}));
