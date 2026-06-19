/**
 * Stage 11 unit tests — CheckInFormScreen submit, InjuryBottomSheet Switch, MyHealthScreen Tabs
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

const mockAddItem = jest.fn();

jest.mock('../../stores/check-ins.store', () => ({
  useCheckInsStore: (sel: (s: {
    addItem: jest.Mock;
    hasCheckedInThisWeek: jest.Mock;
    items: never[];
    loading: boolean;
    fetchCheckIns: jest.Mock;
  }) => unknown) =>
    sel({
      addItem: mockAddItem,
      hasCheckedInThisWeek: jest.fn().mockReturnValue(false),
      items: [],
      loading: false,
      fetchCheckIns: jest.fn(),
    }),
}));

jest.mock('../../lib/api/check-ins.api', () => ({
  createCheckIn: jest.fn(),
}));

jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string; value?: number }) => (
      <View testID={props.testID ?? 'slider'} />
    ),
  };
});

jest.mock('../../lib/check-in-image-upload', () => ({
  pickAndUploadCheckInImage: jest.fn(),
}));

jest.mock('../../stores/health.store', () => ({
  useHealthStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { CheckInFormScreen } from './CheckInFormScreen';
import { createCheckIn } from '../../lib/api/check-ins.api';
import { InjuryBottomSheet } from '../my-health/components/InjuryBottomSheet';
import { MyHealthScreen } from '../my-health/MyHealthScreen';
import { useHealthStore } from '../../stores/health.store';

const mockCreateCheckIn = createCheckIn as jest.MockedFunction<typeof createCheckIn>;
const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;

function makeHealthStoreState(): ReturnType<typeof useHealthStore> {
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
  };
}

// ── CheckInFormScreen ─────────────────────────────────────────────────────────

describe('CheckInFormScreen > submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHealthStore.mockReturnValue(makeHealthStoreState());
  });

  it('calls check-in handler with wellness + diet values', async () => {
    const fakeResult = {
      _id: 'ci-new',
      memberId: 'mem1',
      trainerId: 'tr1',
      submittedAt: new Date().toISOString(),
      sleepQuality: 5,
      energy: 5,
      recovery: 5,
      stress: 5,
      fatigue: 5,
      hunger: 5,
      digestion: 5,
      stuckToDiet: 'yes' as const,
      dietDetails: null,
      wellbeing: null,
      notes: null,
      weight: null,
      waist: null,
      steps: null,
      exerciseMinutes: null,
      walkRunDistance: null,
      sleepHours: null,
      photos: [],
      createdAt: new Date().toISOString(),
    };
    mockCreateCheckIn.mockResolvedValueOnce(fakeResult);

    const { getByTestId } = render(<CheckInFormScreen />);

    // Select a diet option (required)
    fireEvent.press(getByTestId('checkin-diet-yes'));

    // Submit
    await act(async () => {
      fireEvent.press(getByTestId('checkin-form-submit-button'));
    });

    expect(mockCreateCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        stuckToDiet: 'yes',
        sleepQuality: expect.any(Number),
        energy: expect.any(Number),
      }),
    );
    expect(mockAddItem).toHaveBeenCalledWith(fakeResult);
  });
});

// ── InjuryBottomSheet > Switch ────────────────────────────────────────────────

describe('InjuryBottomSheet > Switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles active flag and submits', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { getByTestId } = render(
      <InjuryBottomSheet visible onClose={jest.fn()} onSave={onSave} />,
    );

    // Fill required title
    fireEvent.changeText(getByTestId('injury-title-input'), 'Knee pain');

    // Toggle the seenDoctor switch — Reusables Switch uses onCheckedChange
    fireEvent(getByTestId('injury-seen-doctor-toggle'), 'onCheckedChange', true);

    // Save
    await act(async () => {
      fireEvent.press(getByTestId('injury-save-button'));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Knee pain',
        seenDoctor: true,
      }),
    );
  });
});

// ── MyHealthScreen > Tabs ─────────────────────────────────────────────────────

describe('MyHealthScreen > Tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHealthStore.mockReturnValue(makeHealthStoreState());
  });

  it('switches between health tabs', () => {
    const { getByTestId, getByText } = render(<MyHealthScreen />);

    // Default tab shows injuries content
    expect(getByText('No active injuries')).toBeTruthy();

    // Switch to Medications tab
    fireEvent.press(getByTestId('my-health-tab-medications'));
    expect(getByText('No active medications')).toBeTruthy();

    // Switch to Background tab
    fireEvent.press(getByTestId('my-health-tab-background'));
    expect(getByTestId('background-save-btn')).toBeTruthy();
  });
});
