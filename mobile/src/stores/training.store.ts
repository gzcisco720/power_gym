import { create } from 'zustand';
import {
  fetchMyPlan as apiFetchMyPlan,
  startSession as apiStartSession,
  patchSet as apiPatchSet,
  finishSession as apiFinishSession,
} from '../lib/api/training.api';
import { ActivePlan, WorkoutSession, PatchSetInput } from '../types/training';

interface TrainingState {
  plan: ActivePlan | null;
  activeSession: WorkoutSession | null;
  loading: boolean;
  error: string | null;

  fetchPlan(): Promise<void>;
  startWorkout(dayNumber: number): Promise<WorkoutSession>;
  logSet(input: PatchSetInput): Promise<void>;
  finishWorkout(): Promise<void>;
  loggedSetCount(): number;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  plan: null,
  activeSession: null,
  loading: false,
  error: null,

  async fetchPlan(): Promise<void> {
    set({ loading: true, error: null });
    try {
      const plan = await apiFetchMyPlan();
      set({ plan, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async startWorkout(dayNumber: number): Promise<WorkoutSession> {
    const session = await apiStartSession(dayNumber);
    set({ activeSession: session });
    return session;
  },

  async logSet(input: PatchSetInput): Promise<void> {
    const { activeSession } = get();
    if (!activeSession) return;
    const updated = await apiPatchSet(activeSession._id, input);
    set({ activeSession: updated });
  },

  async finishWorkout(): Promise<void> {
    const { activeSession } = get();
    if (!activeSession) return;
    await apiFinishSession(activeSession._id);
    set({ activeSession: null, error: null });
  },

  loggedSetCount(): number {
    const { activeSession } = get();
    if (!activeSession) return 0;
    return activeSession.sets.filter((s) => s.completedAt !== null).length;
  },
}));
