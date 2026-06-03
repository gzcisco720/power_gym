/**
 * MedicalBackgroundTab unit tests
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
import { MedicalHistory } from '../../../types/health';
import { MedicalBackgroundTab } from './MedicalBackgroundTab';

const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;

const emptyHistory: MedicalHistory = {
  memberId: 'mem1',
  chronicConditions: [],
  surgeries: null,
  allergies: null,
  familyHistory: null,
  currentDoctor: null,
  emergencyContact: null,
  pregnancyStatus: null,
};

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
    medicalHistory: emptyHistory,
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

describe('MedicalBackgroundTab', () => {
  it('Save button is disabled until a field changes (isDirty via JSON.stringify comparison)', () => {
    mockUseHealthStore.mockReturnValue(makeStoreState());
    const { getByTestId } = render(<MedicalBackgroundTab />);

    const saveBtn = getByTestId('background-save-btn');
    // Initially not dirty
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);

    // Change allergies field
    fireEvent.changeText(getByTestId('background-allergies-input'), 'Penicillin');

    // Now dirty
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('adding a chronic condition renders a removable chip and includes it in the saved payload', () => {
    const saveMedicalHistory = jest.fn().mockResolvedValue(undefined);
    mockUseHealthStore.mockReturnValue(makeStoreState({ saveMedicalHistory }));

    const { getByTestId, getByText } = render(<MedicalBackgroundTab />);

    // Type a condition and add it
    fireEvent.changeText(getByTestId('background-condition-input'), 'Asthma');
    fireEvent.press(getByTestId('background-condition-add-btn'));

    // Chip should appear
    expect(getByText('Asthma')).toBeTruthy();

    // Save — chip value must be in payload
    fireEvent.press(getByTestId('background-save-btn'));

    expect(saveMedicalHistory).toHaveBeenCalledWith(
      expect.objectContaining({ chronicConditions: ['Asthma'] }),
    );
  });
});
