import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../src/stores/check-ins.store', () => ({
  useCheckInsStore: jest.fn(),
}));

jest.mock('../../../src/lib/api/check-ins.api', () => ({
  createCheckIn: jest.fn(),
}));

jest.mock('../../../src/lib/check-in-image-upload', () => ({
  pickAndUploadCheckInImage: jest.fn(),
}));

import { useCheckInsStore } from '../../../src/stores/check-ins.store';
import * as checkInsApi from '../../../src/lib/api/check-ins.api';
import { CheckIn } from '../../../src/types/check-ins';
import { CheckInFormScreen } from '../../../src/screens/check-in/CheckInFormScreen';

const mockUseCheckInsStore = useCheckInsStore as jest.MockedFunction<typeof useCheckInsStore>;
const mockCreateCheckIn = checkInsApi.createCheckIn as jest.MockedFunction<typeof checkInsApi.createCheckIn>;

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci-1',
    memberId: 'member-1',
    trainerId: 'trainer-1',
    submittedAt: new Date().toISOString(),
    sleepQuality: 5,
    stress: 5,
    fatigue: 5,
    hunger: 5,
    recovery: 5,
    energy: 5,
    digestion: 5,
    weight: null,
    waist: null,
    steps: null,
    exerciseMinutes: null,
    walkRunDistance: null,
    sleepHours: null,
    stuckToDiet: 'yes',
    dietDetails: null,
    wellbeing: null,
    notes: null,
    photos: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeStoreState(overrides: Partial<ReturnType<typeof useCheckInsStore>> = {}) {
  const state = {
    items: [],
    loading: false,
    error: null,
    fetchCheckIns: jest.fn(),
    addItem: jest.fn(),
    hasCheckedInThisWeek: jest.fn(() => false),
    ...overrides,
  };
  // Support both full-state and selector call patterns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockUseCheckInsStore as jest.Mock).mockImplementation((selector?: (s: typeof state) => any) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CheckInFormScreen', () => {
  it('Submit button is disabled until stuckToDiet is selected', () => {
    makeStoreState();
    const { getByTestId } = render(<CheckInFormScreen />);
    const submitButton = getByTestId('checkin-form-submit-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('selecting stuckToDiet enables the Submit button (sliders default to 5)', () => {
    makeStoreState();
    const { getByTestId } = render(<CheckInFormScreen />);
    fireEvent.press(getByTestId('checkin-diet-yes'));
    const submitButton = getByTestId('checkin-form-submit-button');
    expect(submitButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('submitting calls createCheckIn with the 7 wellness values and selected stuckToDiet', async () => {
    const mockAddItem = jest.fn();
    makeStoreState({ addItem: mockAddItem });
    const result = makeCheckIn();
    mockCreateCheckIn.mockResolvedValueOnce(result);

    const { getByTestId } = render(<CheckInFormScreen />);
    fireEvent.press(getByTestId('checkin-diet-yes'));
    await act(async () => {
      fireEvent.press(getByTestId('checkin-form-submit-button'));
    });

    expect(mockCreateCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        sleepQuality: 5,
        energy: 5,
        recovery: 5,
        stress: 5,
        fatigue: 5,
        hunger: 5,
        digestion: 5,
        stuckToDiet: 'yes',
      }),
    );
  });

  it('a 409 response shows the "already submitted this week" message', async () => {
    makeStoreState();
    const error = { response: { status: 409 } };
    mockCreateCheckIn.mockRejectedValueOnce(error);

    const { getByTestId, getByText } = render(<CheckInFormScreen />);
    fireEvent.press(getByTestId('checkin-diet-yes'));
    await act(async () => {
      fireEvent.press(getByTestId('checkin-form-submit-button'));
    });

    await waitFor(() => {
      expect(getByText("You've already submitted this week")).toBeTruthy();
    });
  });

  it('full interaction: select stuckToDiet=yes → press Submit → createCheckIn resolves → addItem called and goBack invoked', async () => {
    const mockAddItem = jest.fn();
    makeStoreState({ addItem: mockAddItem });
    const result = makeCheckIn();
    mockCreateCheckIn.mockResolvedValueOnce(result);

    const { getByTestId } = render(<CheckInFormScreen />);
    fireEvent.press(getByTestId('checkin-diet-yes'));
    await act(async () => {
      fireEvent.press(getByTestId('checkin-form-submit-button'));
    });

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith(result);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
