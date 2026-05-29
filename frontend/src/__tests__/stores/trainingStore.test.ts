import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/training', () => ({
  fetchPlanTemplates: vi.fn(),
  createPlanTemplate: vi.fn(),
  updatePlanTemplate: vi.fn(),
  deletePlanTemplate: vi.fn(),
  fetchMemberPlan: vi.fn(),
  assignPlan: vi.fn(),
  startSession: vi.fn(),
  fetchSessions: vi.fn(),
  getSession: vi.fn(),
  updateSet: vi.fn(),
  completeSession: vi.fn(),
  fetchPbs: vi.fn(),
}));

import * as trainingApi from '@/api/training';
import { useTrainingStore } from '@/stores/trainingStore';

const mockPlan: trainingApi.PlanTemplate = {
  _id: 'pt1',
  name: 'Strength A',
  description: null,
  createdBy: 'trainer1',
  days: [{ dayNumber: 1, exercises: [] }],
};

const mockMemberPlan: trainingApi.MemberPlan = {
  _id: 'mp1',
  memberId: 'm1',
  templateId: 'pt1',
  name: 'Strength A',
  days: [{ dayNumber: 1, exercises: [] }],
  isActive: true,
  assignedAt: '2026-01-01T00:00:00Z',
};

const mockSession: trainingApi.WorkoutSession = {
  _id: 's1',
  memberId: 'm1',
  memberPlanId: 'mp1',
  dayNumber: 1,
  completedAt: null,
  sets: [{ exerciseId: 'e1', setIndex: 0, weight: null, reps: null, completed: false }],
};

const mockPb: trainingApi.PersonalBest = {
  exerciseId: 'e1',
  exerciseName: 'Bench Press',
  weight: 100,
  reps: 5,
  estimatedOneRepMax: 115,
  loggedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  useTrainingStore.setState({
    plans: [],
    memberPlans: {},
    activeSession: null,
    pbs: {},
    exerciseNotes: {},
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('trainingStore', () => {
  describe('fetchPlans', () => {
    it('populates plan templates', async () => {
      vi.mocked(trainingApi.fetchPlanTemplates).mockResolvedValueOnce([mockPlan]);

      await useTrainingStore.getState().fetchPlans();

      expect(useTrainingStore.getState().plans).toEqual([mockPlan]);
      expect(useTrainingStore.getState().isLoading).toBe(false);
    });
  });

  describe('createPlan', () => {
    it('appends a template', async () => {
      vi.mocked(trainingApi.createPlanTemplate).mockResolvedValueOnce(mockPlan);

      await useTrainingStore.getState().createPlan({ name: 'Strength A' });

      expect(useTrainingStore.getState().plans).toEqual([mockPlan]);
    });
  });

  describe('updatePlan', () => {
    it('replaces an existing template', async () => {
      useTrainingStore.setState({ plans: [mockPlan] });
      const updated = { ...mockPlan, name: 'Updated' };
      vi.mocked(trainingApi.updatePlanTemplate).mockResolvedValueOnce(updated);

      await useTrainingStore.getState().updatePlan('pt1', { name: 'Updated' });

      expect(useTrainingStore.getState().plans[0].name).toBe('Updated');
    });
  });

  describe('deletePlan', () => {
    it('removes a template', async () => {
      useTrainingStore.setState({ plans: [mockPlan] });
      vi.mocked(trainingApi.deletePlanTemplate).mockResolvedValueOnce(undefined);

      await useTrainingStore.getState().deletePlan('pt1');

      expect(useTrainingStore.getState().plans).toHaveLength(0);
    });
  });

  describe('fetchMemberPlan', () => {
    it('populates the member active plan for a member id', async () => {
      vi.mocked(trainingApi.fetchMemberPlan).mockResolvedValueOnce(mockMemberPlan);

      await useTrainingStore.getState().fetchMemberPlan('m1');

      expect(useTrainingStore.getState().memberPlans['m1']).toEqual(mockMemberPlan);
    });
  });

  describe('assignPlan', () => {
    it('sets the member active plan and returns success', async () => {
      vi.mocked(trainingApi.assignPlan).mockResolvedValueOnce(mockMemberPlan);

      await useTrainingStore.getState().assignPlan('m1', 'pt1');

      expect(useTrainingStore.getState().memberPlans['m1']).toEqual(mockMemberPlan);
    });
  });

  describe('startSession', () => {
    it('sets activeSession', async () => {
      vi.mocked(trainingApi.startSession).mockResolvedValueOnce(mockSession);

      await useTrainingStore.getState().startSession('m1', 1);

      expect(useTrainingStore.getState().activeSession).toEqual(mockSession);
    });
  });

  describe('updateSet', () => {
    it('mutates the targeted set inside activeSession', async () => {
      const updatedSession: trainingApi.WorkoutSession = {
        ...mockSession,
        sets: [{ exerciseId: 'e1', setIndex: 0, weight: 80, reps: 10, completed: true }],
      };
      vi.mocked(trainingApi.updateSet).mockResolvedValueOnce(updatedSession);

      await useTrainingStore.getState().updateSet('s1', 0, { weight: 80, reps: 10, completed: true });

      expect(useTrainingStore.getState().activeSession?.sets[0].weight).toBe(80);
    });
  });

  describe('completeSession', () => {
    it('sets activeSession to the completed session', async () => {
      const completedSession: trainingApi.WorkoutSession = { ...mockSession, completedAt: '2026-01-01T12:00:00Z' };
      vi.mocked(trainingApi.completeSession).mockResolvedValueOnce(completedSession);

      await useTrainingStore.getState().completeSession('s1');

      expect(useTrainingStore.getState().activeSession?.completedAt).toBe('2026-01-01T12:00:00Z');
    });
  });

  describe('fetchPbs', () => {
    it('populates PBs for a member id', async () => {
      vi.mocked(trainingApi.fetchPbs).mockResolvedValueOnce([mockPb]);

      await useTrainingStore.getState().fetchPbs('m1');

      expect(useTrainingStore.getState().pbs['m1']).toEqual([mockPb]);
    });
  });

  describe('saveExerciseNote', () => {
    it('stores the note for the exercise', () => {
      useTrainingStore.getState().saveExerciseNote('e1', 'Focus on form');

      expect(useTrainingStore.getState().exerciseNotes['e1']).toBe('Focus on form');
    });
  });
});
