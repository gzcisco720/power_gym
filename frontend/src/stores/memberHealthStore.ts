import { create } from 'zustand';
import * as api from '@/api/member-health';

interface MemberHealthState {
  injuriesByMember: Record<string, api.Injury[]>;
  medicalHistoryByMember: Record<string, api.MedicalHistory>;
  medicationsByMember: Record<string, api.Medication[]>;
  isLoading: boolean;
  error: string | null;
  fetchHealth: (memberId: string) => Promise<void>;
  addInjury: (memberId: string, data: { title: string; bodyPart?: string; trainerNotes?: string; recordedAt?: string }) => Promise<void>;
  deleteInjury: (memberId: string, injuryId: string) => void;
}

export const useMemberHealthStore = create<MemberHealthState>((set) => ({
  injuriesByMember: {},
  medicalHistoryByMember: {},
  medicationsByMember: {},
  isLoading: false,
  error: null,

  fetchHealth: async (memberId) => {
    set({ isLoading: true, error: null });
    try {
      const [injuries, medicalHistory, medications] = await Promise.all([
        api.fetchInjuries(memberId),
        api.fetchMedicalHistory(memberId),
        api.fetchMedications(memberId),
      ]);
      set((s) => ({
        injuriesByMember: { ...s.injuriesByMember, [memberId]: injuries },
        medicalHistoryByMember: { ...s.medicalHistoryByMember, [memberId]: medicalHistory },
        medicationsByMember: { ...s.medicationsByMember, [memberId]: medications },
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addInjury: async (memberId, data) => {
    const injury = await api.createInjury(memberId, data);
    set((s) => ({
      injuriesByMember: {
        ...s.injuriesByMember,
        [memberId]: [...(s.injuriesByMember[memberId] ?? []), injury],
      },
    }));
  },

  deleteInjury: (memberId, injuryId) => {
    set((s) => ({
      injuriesByMember: {
        ...s.injuriesByMember,
        [memberId]: (s.injuriesByMember[memberId] ?? []).filter((inj) => inj._id !== injuryId),
      },
    }));
  },
}));
