/**
 * MedicationsTab unit tests
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
import { Medication } from '../../../types/health';
import { MedicationsTab } from './MedicationsTab';

const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    _id: 'med1',
    memberId: 'mem1',
    name: 'Ibuprofen',
    purpose: 'Pain relief',
    duration: 'short_term',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    notes: null,
    status: 'active',
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

describe('MedicationsTab', () => {
  it('renders active medications and collapses ended ones under an "Ended" toggle with count', () => {
    const active = makeMedication({ _id: 'med1', status: 'active', name: 'Ibuprofen' });
    const ended = makeMedication({ _id: 'med2', status: 'ended', name: 'Amoxicillin' });
    mockUseHealthStore.mockReturnValue(makeStoreState({ medications: [active, ended] }));

    const { getByText, queryByText } = render(<MedicationsTab />);

    expect(getByText('Ibuprofen')).toBeTruthy();
    // Ended section toggle visible with count
    expect(getByText(/Ended.*1/)).toBeTruthy();
    // Ended medication is collapsed
    expect(queryByText('Amoxicillin')).toBeNull();
  });

  it('pressing "Mark as ended" opens a confirmation Dialog and on confirm calls store.updateMedication with status "ended"', () => {
    const medication = makeMedication({ _id: 'med1', status: 'active' });
    const updateMedication = jest.fn().mockResolvedValue(undefined);
    mockUseHealthStore.mockReturnValue(makeStoreState({ medications: [medication], updateMedication }));

    const { getByTestId } = render(<MedicationsTab />);

    // Tap "Mark as ended"
    fireEvent.press(getByTestId('medication-end-btn-med1'));

    // Tap confirm
    fireEvent.press(getByTestId('medication-end-confirm-btn'));

    expect(updateMedication).toHaveBeenCalledWith('med1', { status: 'ended' });
  });
});
