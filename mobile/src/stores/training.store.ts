import { create } from 'zustand';
import {
  fetchMyPlan as apiFetchMyPlan,
  startSession as apiStartSession,
  patchSet as apiPatchSet,
  finishSession as apiFinishSession,
  fetchMemberPlan as apiFetchMemberPlan,
  startMemberSession as apiStartMemberSession,
  patchMemberSet as apiPatchMemberSet,
  finishMemberSession as apiFinishMemberSession,
} from '../lib/api/training.api';
import { ActivePlan, WorkoutSession, PatchSetInput } from '../types/training';

interface TrainingState {
  plan: ActivePlan | null;
  activeSession: WorkoutSession | null;
  memberSession: WorkoutSession | null;
  loading: boolean;
  error: string | null;

  fetchPlan(): Promise<void>;
  startWorkout(dayNumber: number): Promise<WorkoutSession>;
  logSet(input: PatchSetInput): Promise<void>;
  finishWorkout(): Promise<void>;
  loggedSetCount(): number;
  fetchMemberPlan(memberId: string): Promise<ActivePlan | null>;
  startMemberSession(memberId: string, dayNumber: number): Promise<WorkoutSession>;
  patchMemberSet(memberId: string, input: PatchSetInput): Promise<void>;
  finishMemberSession(memberId: string): Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  plan: null,
  activeSession: null,
  memberSession: null,
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

  async fetchMemberPlan(memberId: string): Promise<ActivePlan | null> {
    return apiFetchMemberPlan(memberId);
  },

  async startMemberSession(memberId: string, dayNumber: number): Promise<WorkoutSession> {
    const session = await apiStartMemberSession(memberId, dayNumber);
    set({ memberSession: session });
    return session;
  },

  async patchMemberSet(memberId: string, input: PatchSetInput): Promise<void> {
    const { memberSession } = get();
    if (!memberSession) return;
    const updated = await apiPatchMemberSet(memberId, memberSession._id, input);
    set({ memberSession: updated });
  },

  async finishMemberSession(memberId: string): Promise<void> {
    const { memberSession } = get();
    if (!memberSession) return;
    await apiFinishMemberSession(memberId, memberSession._id);
    set({ memberSession: null });
  },
}));
