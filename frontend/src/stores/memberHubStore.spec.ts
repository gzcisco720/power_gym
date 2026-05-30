import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('@/api/member-hub', () => ({
  fetchMemberOverview: vi.fn(),
  fetchMemberPlan: vi.fn(),
  fetchMemberNutrition: vi.fn(),
  assignPlan: vi.fn(),
  assignNutrition: vi.fn(),
  fetchMemberBodyTests: vi.fn(),
  createBodyTest: vi.fn(),
  fetchMemberHealth: vi.fn(),
  createInjury: vi.fn(),
  updateInjury: vi.fn(),
  deleteInjury: vi.fn(),
  fetchMemberCheckIns: vi.fn(),
  fetchMemberProgress: vi.fn(),
}));

import { useMemberHubStore } from './memberHubStore';
import * as api from '@/api/member-hub';

const mockProfile = {
  _id: 'mem1',
  name: 'Test Member',
  email: 'member@test.com',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockStatStrip = {
  weight: 80,
  bodyFatPct: 15.5,
  sessionsLast90: 12,
  lastSessionLabel: '2d ago',
  lastDayName: 'Push Day',
  weightDelta: null,
  bfDelta: null,
};

const mockPlanCard = {
  _id: 'plan1',
  name: 'Hypertrophy Program',
  days: [{ dayNumber: 1, name: 'Push Day', exercises: [] }],
  assignedAt: '2024-03-01T00:00:00.000Z',
  recentSessions: [],
};

const mockHealthSummary = {
  injuries: [],
  activeMeds: [],
};

const mockOverviewResponse = {
  profile: mockProfile,
  statStrip: mockStatStrip,
  planCard: mockPlanCard,
  healthSummary: mockHealthSummary,
};

const mockPlan = {
  active: {
    _id: 'plan1',
    name: 'Hypertrophy Program',
    days: [{ dayNumber: 1, name: 'Push Day', exercises: [] }],
    assignedAt: '2024-03-01T00:00:00.000Z',
  },
  templates: [],
  sessions: [],
  pbs: [],
};

beforeEach(() => {
  useMemberHubStore.setState({
    memberId: null,
    profile: null,
    statStrip: null,
    planCard: null,
    healthSummary: null,
    plan: null,
    nutrition: null,
    bodyTests: [],
    injuries: [],
    medicalHistory: null,
    medications: [],
    checkIns: [],
    progress: null,
    isLoadingOverview: false,
    isLoadingPlan: false,
    isLoadingNutrition: false,
    isLoadingBodyTests: false,
    isLoadingHealth: false,
    isLoadingCheckIns: false,
    isLoadingProgress: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('memberHubStore', () => {
  describe('fetchOverview', () => {
    it('populates member, plan card, stat strip, health summary', async () => {
      vi.mocked(api.fetchMemberOverview).mockResolvedValueOnce(mockOverviewResponse);

      await act(async () => {
        await useMemberHubStore.getState().fetchOverview('mem1');
      });

      const state = useMemberHubStore.getState();
      expect(state.profile).toEqual(mockProfile);
      expect(state.statStrip).toEqual(mockStatStrip);
      expect(state.planCard).toEqual(mockPlanCard);
      expect(state.healthSummary).toEqual(mockHealthSummary);
      expect(state.isLoadingOverview).toBe(false);
      expect(state.memberId).toBe('mem1');
    });

    it('sets error and clears isLoadingOverview on failure', async () => {
      vi.mocked(api.fetchMemberOverview).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useMemberHubStore.getState().fetchOverview('mem1');
      });

      const state = useMemberHubStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoadingOverview).toBe(false);
    });
  });

  describe('fetchPlan', () => {
    it('populates the active plan days', async () => {
      vi.mocked(api.fetchMemberPlan).mockResolvedValueOnce(mockPlan);

      await act(async () => {
        await useMemberHubStore.getState().fetchPlan('mem1');
      });

      const state = useMemberHubStore.getState();
      expect(state.plan).not.toBeNull();
      expect(state.plan?.active?.days).toHaveLength(1);
      expect(state.plan?.active?.days[0].name).toBe('Push Day');
      expect(state.isLoadingPlan).toBe(false);
    });
  });

  describe('fetchBodyTests', () => {
    it('populates test history', async () => {
      const mockTests = [
        { _id: 'bt1', date: '2024-01-01T00:00:00.000Z', protocol: '3site' as const, weight: 80, bodyFatPct: 15, leanMassKg: 68, fatMassKg: 12, targetWeight: null, targetBodyFatPct: null },
        { _id: 'bt2', date: '2024-02-01T00:00:00.000Z', protocol: '3site' as const, weight: 78, bodyFatPct: 14, leanMassKg: 67, fatMassKg: 11, targetWeight: null, targetBodyFatPct: null },
      ];
      vi.mocked(api.fetchMemberBodyTests).mockResolvedValueOnce(mockTests);

      await act(async () => {
        await useMemberHubStore.getState().fetchBodyTests('mem1');
      });

      const state = useMemberHubStore.getState();
      expect(state.bodyTests).toHaveLength(2);
      expect(state.bodyTests[0]._id).toBe('bt1');
      expect(state.isLoadingBodyTests).toBe(false);
    });
  });

  describe('addInjury', () => {
    it('prepends injury to health list', async () => {
      const existing = { _id: 'inj1', title: 'Existing', status: 'active' as const, recordedAt: '2024-01-01T00:00:00.000Z', resolvedAt: null, trainerNotes: null, memberNotes: null, affectedMovements: null, injuryType: null, bodyPart: null, bodySide: null, painAtRest: null, painDuringExercise: null, mechanism: null, aggravatingFactors: null, relievingFactors: null, doctorRestrictions: null, rehabilitationStatus: null, seenDoctor: false, createdByRole: 'trainer' as const };
      const newInjury = { _id: 'inj2', title: 'New Knee Strain', status: 'active' as const, recordedAt: '2024-02-01T00:00:00.000Z', resolvedAt: null, trainerNotes: null, memberNotes: null, affectedMovements: null, injuryType: null, bodyPart: null, bodySide: null, painAtRest: null, painDuringExercise: null, mechanism: null, aggravatingFactors: null, relievingFactors: null, doctorRestrictions: null, rehabilitationStatus: null, seenDoctor: false, createdByRole: 'trainer' as const };

      useMemberHubStore.setState({ injuries: [existing] });
      vi.mocked(api.createInjury).mockResolvedValueOnce(newInjury);

      await act(async () => {
        await useMemberHubStore.getState().addInjury('mem1', { title: 'New Knee Strain' });
      });

      const state = useMemberHubStore.getState();
      expect(state.injuries).toHaveLength(2);
      expect(state.injuries[0]._id).toBe('inj2');
      expect(state.injuries[0].title).toBe('New Knee Strain');
    });
  });
});
