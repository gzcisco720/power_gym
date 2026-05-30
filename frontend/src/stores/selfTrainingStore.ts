import { create } from 'zustand';
import {
  fetchActiveLog,
  fetchLogById,
  createLog,
  addSet,
  sealLog,
  deleteLog,
  fetchLogsByMonth,
  fetchRange,
  fetchTemplates,
} from '@/api/self-training';
import type {
  SelfWorkoutLog,
  SelfWorkoutSet,
  CreateLogPayload,
  UserTemplate,
  UserTemplateDay,
} from '@/api/self-training';
import { buildPlannedSets } from '@/components/self-tracking/build-planned-sets';

export type { SelfWorkoutLog, SelfWorkoutSet, UserTemplate, UserTemplateDay };

interface FreestyleExercise {
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
}

interface SelfTrainingState {
  activeLog: SelfWorkoutLog | null;
  activeLogId: string | null;
  /** The ISO string of when the session started — isolated from set-logging to prevent timer resets */
  timerStartedAt: string | null;
  isLoading: boolean;
  error: string | null;

  fetchActive: () => Promise<void>;
  fetchLog: (id: string) => Promise<SelfWorkoutLog | null>;
  startSession: (payload: CreateLogPayload, deleteActive?: boolean) => Promise<SelfWorkoutLog>;
  /** Start a template-based session: seeds planned sets from the given template day. */
  startFromTemplate: (
    templateId: string,
    day: UserTemplateDay,
    deleteActive?: boolean,
  ) => Promise<SelfWorkoutLog>;
  /** Add one freestyle exercise (first set) to an active log. */
  freestyleAddExercise: (logId: string, exercise: FreestyleExercise) => Promise<SelfWorkoutLog>;
  logSet: (logId: string, set: SelfWorkoutSet) => Promise<SelfWorkoutLog>;
  seal: (logId: string) => Promise<void>;
  discard: (logId: string) => Promise<void>;
  fetchByMonth: (year: number, month: number) => Promise<SelfWorkoutLog[]>;
  fetchRangeData: (start: string, end: string) => Promise<SelfWorkoutLog[]>;
  fetchUserTemplates: () => Promise<UserTemplate[]>;
}

export const useSelfTrainingStore = create<SelfTrainingState>((set) => ({
  activeLog: null,
  activeLogId: null,
  timerStartedAt: null,
  isLoading: false,
  error: null,

  fetchActive: async () => {
    set({ isLoading: true, error: null });
    try {
      const log = await fetchActiveLog();
      set({
        activeLog: log,
        activeLogId: log?._id ?? null,
        timerStartedAt: log?.startedAt ?? null,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  fetchLog: async (id: string) => {
    const log = await fetchLogById(id);
    return log;
  },

  startSession: async (payload: CreateLogPayload, deleteActive = false) => {
    const log = await createLog(payload, deleteActive);
    set({
      activeLog: log,
      activeLogId: log._id,
      // Set timerStartedAt from log.startedAt — this is isolated from set-log updates
      timerStartedAt: log.startedAt,
    });
    return log;
  },

  startFromTemplate: async (
    templateId: string,
    day: UserTemplateDay,
    deleteActive = false,
  ) => {
    const plannedSets = buildPlannedSets(day);
    const log = await createLog(
      {
        dayName: day.name,
        sourceTemplateId: templateId,
        sourceTemplateDayNumber: day.dayNumber,
        plannedSets,
      },
      deleteActive,
    );
    set({
      activeLog: log,
      activeLogId: log._id,
      timerStartedAt: log.startedAt,
    });
    return log;
  },

  freestyleAddExercise: async (logId: string, exercise: FreestyleExercise) => {
    // Generate a unique groupId for this exercise
    const groupId = `${exercise.exerciseId}-${Date.now()}`;
    const firstSet: SelfWorkoutSet = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      groupId,
      isSuperset: false,
      isBodyweight: exercise.isBodyweight,
      setNumber: 1,
      prescribedRepsMin: null,
      prescribedRepsMax: null,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    };
    const updated = await addSet(logId, firstSet);
    set((state) => ({
      activeLog: updated,
      activeLogId: updated._id,
      timerStartedAt: state.timerStartedAt,
    }));
    return updated;
  },

  logSet: async (logId: string, newSet: SelfWorkoutSet) => {
    // addSet updates the log (adds a set) but must NOT reset timerStartedAt
    const updated = await addSet(logId, newSet);
    set((state) => ({
      activeLog: updated,
      activeLogId: updated._id,
      // CRITICAL: preserve existing timerStartedAt — do NOT update it from updated.startedAt
      // This fixes the v1 bug where timer was reset every time a set was logged.
      timerStartedAt: state.timerStartedAt,
    }));
    return updated;
  },

  seal: async (logId: string) => {
    await sealLog(logId);
    set({ activeLog: null, activeLogId: null, timerStartedAt: null });
  },

  discard: async (logId: string) => {
    await deleteLog(logId);
    set({ activeLog: null, activeLogId: null, timerStartedAt: null });
  },

  fetchByMonth: async (year: number, month: number) => {
    return fetchLogsByMonth(year, month);
  },

  fetchRangeData: async (start: string, end: string) => {
    return fetchRange(start, end);
  },

  fetchUserTemplates: async () => {
    return fetchTemplates();
  },
}));
