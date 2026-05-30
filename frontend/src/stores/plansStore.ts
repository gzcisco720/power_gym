import { create } from 'zustand';
import {
  fetchPlans,
  fetchPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from '@/api/plans';
import type { PlanListItem, PlanDetail, PlanPayload } from '@/api/plans';

interface PlansState {
  plans: PlanListItem[];
  currentPlan: PlanDetail | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  save: (payload: PlanPayload) => Promise<PlanDetail>;
  update: (id: string, payload: PlanPayload) => Promise<PlanDetail>;
  remove: (id: string) => Promise<void>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await fetchPlans();
      set({ plans, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchOne: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await fetchPlanById(id);
      set({ currentPlan: plan, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  save: async (payload: PlanPayload) => {
    const created = await createPlan(payload);
    // Re-fetch list to keep it in sync
    const fresh = await fetchPlans();
    const existingIds = new Set(get().plans.map((p) => p._id));
    const newPlans = fresh.filter((p) => !existingIds.has(p._id));
    set({ plans: [...newPlans, ...get().plans] });
    return created;
  },

  update: async (id: string, payload: PlanPayload) => {
    const updated = await updatePlan(id, payload);
    set({
      plans: get().plans.map((p) =>
        p._id === id ? { ...p, name: updated.name, description: updated.description } : p,
      ),
      currentPlan: updated,
    });
    return updated;
  },

  remove: async (id: string) => {
    await deletePlan(id);
    set({ plans: get().plans.filter((p) => p._id !== id) });
  },
}));
