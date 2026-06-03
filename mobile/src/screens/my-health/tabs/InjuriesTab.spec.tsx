/**
 * InjuriesTab unit tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/health.store', () => ({
  useHealthStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useHealthStore } from '../../../stores/health.store';
import { Injury } from '../../../types/health';
import { InjuriesTab } from './InjuriesTab';
import { InjuryBottomSheet } from '../components/InjuryBottomSheet';

const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;

function makeInjury(overrides: Partial<Injury> = {}): Injury {
  return {
    _id: 'inj1',
    memberId: 'mem1',
    title: 'Left knee strain',
    status: 'active',
    recordedAt: '2026-01-01T00:00:00.000Z',
    createdByRole: 'member',
    injuryType: null,
    bodyPart: null,
    bodySide: null,
    painAtRest: null,
    painDuringExercise: null,
    memberNotes: null,
    trainerNotes: null,
    affectedMovements: null,
    mechanism: null,
    aggravatingFactors: null,
    relievingFactors: null,
    seenDoctor: false,
    doctorRestrictions: null,
    rehabilitationStatus: null,
    resolvedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStoreState(overrides: Partial<ReturnType<typeof useHealthStore>> = {}) {
  return {
    injuries: [],
    injuriesLoading: false,
    injuriesError: null,
    fetchInjuries: jest.fn(),
    addInjury: jest.fn(),
    updateInjury: jest.fn(),
    deleteInjury: jest.fn(),
    medications: [],
    medicationsLoading: false,
    medicationsError: null,
    fetchMedications: jest.fn(),
    addMedication: jest.fn(),
    updateMedication: jest.fn(),
    deleteMedication: jest.fn(),
    medicalHistory: null,
    medicalHistoryLoading: false,
    medicalHistoryError: null,
    fetchMedicalHistory: jest.fn(),
    saveMedicalHistory: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InjuriesTab', () => {
  it('renders active injuries as cards and collapses resolved injuries under a "History" toggle showing the resolved count', () => {
    const active = makeInjury({ _id: 'inj1', status: 'active', title: 'Active Knee' });
    const resolved = makeInjury({ _id: 'inj2', status: 'resolved', title: 'Old Shoulder', resolvedAt: '2026-01-10T00:00:00.000Z' });
    mockUseHealthStore.mockReturnValue(makeStoreState({ injuries: [active, resolved] }));

    const { getByText, queryByText } = render(<InjuriesTab />);

    expect(getByText('Active Knee')).toBeTruthy();
    // History toggle should show count
    expect(getByText(/History.*1/)).toBeTruthy();
    // Resolved injury should be collapsed (not visible) until toggle is pressed
    expect(queryByText('Old Shoulder')).toBeNull();
  });

  it('shows 3 skeleton rows while injuriesLoading is true', () => {
    mockUseHealthStore.mockReturnValue(makeStoreState({ injuriesLoading: true }));
    const { getAllByTestId } = render(<InjuriesTab />);
    expect(getAllByTestId('injuries-skeleton-row').length).toBe(3);
  });

  it('shows an empty-state card with "No active injuries" when there are no active injuries', () => {
    mockUseHealthStore.mockReturnValue(makeStoreState({ injuries: [] }));
    const { getByText } = render(<InjuriesTab />);
    expect(getByText('No active injuries')).toBeTruthy();
  });

  it('pressing "Mark resolved" opens a confirmation Dialog and, on confirm, calls store.updateInjury with status "resolved"', () => {
    const injury = makeInjury({ _id: 'inj1', status: 'active' });
    const updateInjury = jest.fn().mockResolvedValue(undefined);
    mockUseHealthStore.mockReturnValue(makeStoreState({ injuries: [injury], updateInjury }));

    const { getByTestId } = render(<InjuriesTab />);

    // Tap "Mark resolved"
    fireEvent.press(getByTestId('injury-resolve-btn-inj1'));

    // Confirm dialog should be open — tap confirm
    fireEvent.press(getByTestId('injury-resolve-confirm-btn'));

    expect(updateInjury).toHaveBeenCalledWith('inj1', { status: 'resolved' });
  });
});

describe('InjuryBottomSheet', () => {
  it('submitting with an empty title shows an inline validation error and does not call the create action', () => {
    const onSave = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <InjuryBottomSheet visible onClose={jest.fn()} onSave={onSave} />,
    );

    // Tap Save without filling title
    fireEvent.press(getByTestId('injury-save-button'));

    // Error message should be visible
    expect(getByTestId('injury-title-error')).toBeTruthy();
    // onSave should NOT be called
    expect(onSave).not.toHaveBeenCalled();
    // Sheet stays open (modal still visible)
    expect(queryByTestId('injury-save-button')).toBeTruthy();
  });
});
