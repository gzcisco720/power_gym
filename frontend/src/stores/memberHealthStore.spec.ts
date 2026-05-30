import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/member-hub', () => ({
  fetchMemberHealth: vi.fn(),
  createInjury: vi.fn(),
  updateInjury: vi.fn(),
  deleteInjury: vi.fn(),
}));

import { useMemberHealthStore } from './memberHealthStore';
import { createInjury } from '@/api/member-hub';

const mockCreate = vi.mocked(createInjury);

beforeEach(() => {
  useMemberHealthStore.setState({ injuries: [], medications: [], medicalHistory: null, isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('memberHealthStore', () => {
  it('addInjury > adds to the member\'s injury list', async () => {
    useMemberHealthStore.setState({
      injuries: [],
      medications: [],
      medicalHistory: null,
      isLoading: false,
      error: null,
    });

    const newInjury = {
      _id: 'inj1',
      title: 'Knee pain',
      status: 'active' as const,
      recordedAt: '2025-01-01T00:00:00.000Z',
      resolvedAt: null,
      trainerNotes: null,
      memberNotes: null,
      affectedMovements: null,
      injuryType: null,
      bodyPart: null,
      bodySide: null,
      painAtRest: null,
      painDuringExercise: null,
      mechanism: null,
      aggravatingFactors: null,
      relievingFactors: null,
      doctorRestrictions: null,
      rehabilitationStatus: null,
      seenDoctor: false,
      createdByRole: 'member' as const,
    };

    mockCreate.mockResolvedValueOnce(newInjury);

    const store = useMemberHealthStore.getState();
    await store.addInjury('member-123', { title: 'Knee pain' });

    const state = useMemberHealthStore.getState();
    expect(state.injuries).toHaveLength(1);
    expect(state.injuries[0]._id).toBe('inj1');
    expect(state.injuries[0].title).toBe('Knee pain');
    expect(mockCreate).toHaveBeenCalledWith('member-123', { title: 'Knee pain' });
  });
});
