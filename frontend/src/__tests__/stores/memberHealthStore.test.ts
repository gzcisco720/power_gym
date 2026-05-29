import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/member-health', () => ({
  fetchInjuries: vi.fn(),
  createInjury: vi.fn(),
  fetchMedicalHistory: vi.fn(),
  fetchMedications: vi.fn(),
}));

import * as memberHealthApi from '@/api/member-health';
import { useMemberHealthStore } from '@/stores/memberHealthStore';

const mockInjury: memberHealthApi.Injury = {
  _id: 'inj1',
  memberId: 'm1',
  title: 'Knee pain',
  status: 'active',
  recordedAt: '2026-01-01T00:00:00Z',
  bodyPart: 'knee',
  trainerNotes: null,
  resolvedAt: null,
};

const mockMedicalHistory: memberHealthApi.MedicalHistory = {
  memberId: 'm1',
  conditions: ['asthma'],
  allergies: ['peanuts'],
  notes: null,
};

const mockMedication: memberHealthApi.Medication = {
  _id: 'med1',
  memberId: 'm1',
  name: 'Ventolin',
  dosage: '200mcg',
  frequency: 'as needed',
};

beforeEach(() => {
  useMemberHealthStore.setState({
    injuriesByMember: {},
    medicalHistoryByMember: {},
    medicationsByMember: {},
    isLoading: false,
    error: null,
  });
  vi.clearAllMocks();
});

describe('memberHealthStore', () => {
  describe('fetchHealth', () => {
    it('populates injuries, medical history, medications', async () => {
      vi.mocked(memberHealthApi.fetchInjuries).mockResolvedValueOnce([mockInjury]);
      vi.mocked(memberHealthApi.fetchMedicalHistory).mockResolvedValueOnce(mockMedicalHistory);
      vi.mocked(memberHealthApi.fetchMedications).mockResolvedValueOnce([mockMedication]);

      await useMemberHealthStore.getState().fetchHealth('m1');

      const state = useMemberHealthStore.getState();
      expect(state.injuriesByMember['m1']).toEqual([mockInjury]);
      expect(state.medicalHistoryByMember['m1']).toEqual(mockMedicalHistory);
      expect(state.medicationsByMember['m1']).toEqual([mockMedication]);
    });
  });

  describe('addInjury', () => {
    it('appends an injury to the member list', async () => {
      useMemberHealthStore.setState({ injuriesByMember: { m1: [] } });
      vi.mocked(memberHealthApi.createInjury).mockResolvedValueOnce(mockInjury);

      await useMemberHealthStore.getState().addInjury('m1', {
        title: 'Knee pain',
      });

      expect(useMemberHealthStore.getState().injuriesByMember['m1']).toHaveLength(1);
      expect(useMemberHealthStore.getState().injuriesByMember['m1'][0]).toEqual(mockInjury);
    });
  });

  describe('deleteInjury', () => {
    it('removes an injury by id', async () => {
      useMemberHealthStore.setState({ injuriesByMember: { m1: [mockInjury] } });

      useMemberHealthStore.getState().deleteInjury('m1', 'inj1');

      expect(useMemberHealthStore.getState().injuriesByMember['m1']).toHaveLength(0);
    });
  });
});
