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

import { useSelfTrainingStore } from './selfTrainingStore';
import * as selfTrainingApi from '@/api/self-training';

const mockCreateLog = vi.mocked(selfTrainingApi.createLog);
const mockAddSet = vi.mocked(selfTrainingApi.addSet);

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
