import { create } from 'zustand';
import * as api from '@/api/training';

interface TrainingState {
  plans: api.PlanTemplate[];
  memberPlans: Record<string, api.MemberPlan | null>;
  activeSession: api.WorkoutSession | null;
  pbs: Record<string, api.PersonalBest[]>;
  exerciseNotes: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  createPlan: (data: { name: string; description?: string }) => Promise<void>;
  updatePlan: (id: string, data: Partial<api.PlanTemplate>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  fetchMemberPlan: (memberId: string) => Promise<void>;
  assignPlan: (memberId: string, planTemplateId: string) => Promise<void>;
  startSession: (memberId: string, dayNumber: number) => Promise<void>;
  updateSet: (sessionId: string, setIndex: number, data: { weight?: number; reps?: number; completed?: boolean }) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  fetchPbs: (memberId: string) => Promise<void>;
  saveExerciseNote: (exerciseId: string, note: string) => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  plans: [],
  memberPlans: {},
  activeSession: null,
  pbs: {},
  exerciseNotes: {},
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await api.fetchPlanTemplates();
      set({ plans, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createPlan: async (data) => {
    const plan = await api.createPlanTemplate(data);
    set((s) => ({ plans: [...s.plans, plan] }));
  },

  updatePlan: async (id, data) => {
    const updated = await api.updatePlanTemplate(id, data);
    set((s) => ({ plans: s.plans.map((p) => (p._id === id ? updated : p)) }));
  },

  deletePlan: async (id) => {
    await api.deletePlanTemplate(id);
    set((s) => ({ plans: s.plans.filter((p) => p._id !== id) }));
  },

  fetchMemberPlan: async (memberId) => {
    try {
      const plan = await api.fetchMemberPlan(memberId);
      set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: plan } }));
    } catch {
      set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: null } }));
    }
  },

  assignPlan: async (memberId, planTemplateId) => {
    const plan = await api.assignPlan(memberId, planTemplateId);
    set((s) => ({ memberPlans: { ...s.memberPlans, [memberId]: plan } }));
  },

  startSession: async (memberId, dayNumber) => {
    const session = await api.startSession(memberId, dayNumber);
    set({ activeSession: session });
  },

  updateSet: async (sessionId, setIndex, data) => {
    const session = await api.updateSet(sessionId, setIndex, data);
    set({ activeSession: session });
  },

  completeSession: async (sessionId) => {
    const completed = await api.completeSession(sessionId);
    set({ activeSession: completed });
  },

  fetchPbs: async (memberId) => {
    const pbs = await api.fetchPbs(memberId);
    set((s) => ({ pbs: { ...s.pbs, [memberId]: pbs } }));
  },

  saveExerciseNote: (exerciseId, note) => {
    set((s) => ({ exerciseNotes: { ...s.exerciseNotes, [exerciseId]: note } }));
  },
}));
