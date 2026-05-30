import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/self-training', () => ({
  fetchActiveLog: vi.fn(),
  fetchLogById: vi.fn(),
  createLog: vi.fn(),
  addSet: vi.fn(),
  updateSet: vi.fn(),
  completeLog: vi.fn(),
  sealLog: vi.fn(),
  deleteLog: vi.fn(),
  fetchRange: vi.fn(),
  fetchLogsByMonth: vi.fn(),
  fetchTemplates: vi.fn(),
}));

vi.mock('@/components/self-tracking/build-planned-sets', () => ({
  buildPlannedSets: vi.fn((day: { exercises: unknown[] }) =>
    day.exercises.map((ex: unknown) => ({
      exerciseId: (ex as { exerciseId: string }).exerciseId,
      exerciseName: (ex as { exerciseName: string }).exerciseName,
      groupId: 'grp1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  ),
}));

import { useSelfTrainingStore } from './selfTrainingStore';
import * as selfTrainingApi from '@/api/self-training';
import * as buildPlannedSetsModule from '@/components/self-tracking/build-planned-sets';

const mockCreateLog = vi.mocked(selfTrainingApi.createLog);
const mockAddSet = vi.mocked(selfTrainingApi.addSet);
const mockBuildPlannedSets = vi.mocked(buildPlannedSetsModule.buildPlannedSets);

const makeLog = (overrides = {}) => ({
  _id: 'log1',
  dayName: 'Freestyle',
  startedAt: '2024-01-01T10:00:00.000Z',
  completedAt: null,
  lastActivityAt: null,
  sourceTemplateId: null,
  sourceTemplateDayNumber: null,
  rpe: null,
  note: null,
  autoSealed: false,
  sets: [],
  ...overrides,
});

describe('selfTrainingStore', () => {
  beforeEach(() => {
    useSelfTrainingStore.setState({
      activeLog: null,
      activeLogId: null,
      isLoading: false,
      error: null,
      timerStartedAt: null,
    });
    vi.clearAllMocks();
  });

  describe('startSession', () => {
    it('creates log and navigates state to active', async () => {
      const log = makeLog();
      mockCreateLog.mockResolvedValue(log);

      await useSelfTrainingStore.getState().startSession({
        dayName: 'Freestyle',
        plannedSets: [],
      });

      const state = useSelfTrainingStore.getState();
      expect(state.activeLog).not.toBeNull();
      expect(state.activeLog?._id).toBe('log1');
      expect(state.activeLogId).toBe('log1');
      expect(state.timerStartedAt).toBe('2024-01-01T10:00:00.000Z');
    });
  });

  describe('startFromTemplate', () => {
    it('seeds session sets from a plan template day', async () => {
      const templateDay = {
        dayNumber: 1,
        name: 'Leg Day',
        exercises: [
          {
            exerciseId: 'ex-squat',
            exerciseName: 'Squat',
            groupId: 'grp1',
            isSuperset: false,
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
          },
        ],
      };

      const expectedSets = [
        {
          exerciseId: 'ex-squat',
          exerciseName: 'Squat',
          groupId: 'grp1',
          isSuperset: false,
          isBodyweight: false,
          setNumber: 1,
          prescribedRepsMin: 8,
          prescribedRepsMax: 12,
          actualWeight: null,
          actualReps: null,
          completedAt: null,
        },
      ];

      const log = makeLog({
        dayName: 'Leg Day',
        sourceTemplateId: 'tpl1',
        sourceTemplateDayNumber: 1,
        sets: expectedSets,
      });

      mockCreateLog.mockResolvedValue(log);

      await useSelfTrainingStore.getState().startFromTemplate('tpl1', templateDay);

      expect(mockBuildPlannedSets).toHaveBeenCalledWith(templateDay);
      expect(mockCreateLog).toHaveBeenCalledWith(
        expect.objectContaining({
          dayName: 'Leg Day',
          sourceTemplateId: 'tpl1',
          sourceTemplateDayNumber: 1,
          plannedSets: expectedSets,
        }),
        false,
      );

      const state = useSelfTrainingStore.getState();
      expect(state.activeLog).not.toBeNull();
      expect(state.activeLog?.sets).toHaveLength(1);
    });
  });

  describe('freestyleAddExercise', () => {
    it('adds an exercise group to the active session', async () => {
      const exercise = {
        exerciseId: 'ex-bench',
        exerciseName: 'Bench Press',
        isBodyweight: false,
      };

      const initialLog = makeLog({ sets: [] });
      const updatedLog = makeLog({
        sets: [
          {
            exerciseId: 'ex-bench',
            exerciseName: 'Bench Press',
            groupId: expect.any(String) as string,
            isSuperset: false,
            isBodyweight: false,
            setNumber: 1,
            prescribedRepsMin: null,
            prescribedRepsMax: null,
            actualWeight: null,
            actualReps: null,
            completedAt: null,
          },
        ],
      });

      mockAddSet.mockResolvedValue(updatedLog);

      useSelfTrainingStore.setState({
        activeLog: initialLog,
        activeLogId: initialLog._id,
        timerStartedAt: initialLog.startedAt,
      });

      await useSelfTrainingStore.getState().freestyleAddExercise('log1', exercise);

      expect(mockAddSet).toHaveBeenCalledOnce();
      const state = useSelfTrainingStore.getState();
      expect(state.activeLog?.sets).toHaveLength(1);
    });
  });

  describe('logSet', () => {
    it('appends set without resetting timer state', async () => {
      const initialLog = makeLog({
        sets: [
          {
            exerciseId: 'ex1',
            exerciseName: 'Bench Press',
            groupId: 'g1',
            isSuperset: false,
            isBodyweight: false,
            setNumber: 1,
            prescribedRepsMin: null,
            prescribedRepsMax: null,
            actualWeight: 80,
            actualReps: 8,
            completedAt: '2024-01-01T10:01:00.000Z',
          },
        ],
      });
      const updatedLog = makeLog({
        sets: [
          ...initialLog.sets,
          {
            exerciseId: 'ex1',
            exerciseName: 'Bench Press',
            groupId: 'g1',
            isSuperset: false,
            isBodyweight: false,
            setNumber: 2,
            prescribedRepsMin: null,
            prescribedRepsMax: null,
            actualWeight: null,
            actualReps: null,
            completedAt: null,
          },
        ],
      });

      mockAddSet.mockResolvedValue(updatedLog);

      // Set initial store state with timer already running
      const timerBefore = '2024-01-01T10:00:00.000Z';
      useSelfTrainingStore.setState({
        activeLog: initialLog,
        activeLogId: initialLog._id,
        timerStartedAt: timerBefore,
      });

      await useSelfTrainingStore.getState().logSet('log1', {
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        groupId: 'g1',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 2,
        prescribedRepsMin: null,
        prescribedRepsMax: null,
        actualWeight: null,
        actualReps: null,
        completedAt: null,
      });

      const state = useSelfTrainingStore.getState();
      expect(state.activeLog?.sets).toHaveLength(2);
      // Timer MUST NOT have been reset — this is the v1 bug fix
      expect(state.timerStartedAt).toBe(timerBefore);
    });
  });
});
