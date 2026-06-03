import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockNavigate = jest.fn();

jest.mock('../../../src/stores/check-ins.store', () => ({
  useCheckInsStore: jest.fn(),
}));

import { useCheckInsStore } from '../../../src/stores/check-ins.store';
import { CheckIn } from '../../../src/types/check-ins';
import { CheckInScreen } from '../../../src/screens/check-in/CheckInScreen';

const mockUseCheckInsStore = useCheckInsStore as jest.MockedFunction<typeof useCheckInsStore>;

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci-1',
    memberId: 'member-1',
    trainerId: 'trainer-1',
    submittedAt: new Date().toISOString(),
    sleepQuality: 7,
    stress: 5,
    fatigue: 4,
    hunger: 6,
    recovery: 8,
    energy: 7,
    digestion: 6,
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
  return {
    items: [],
    loading: false,
    error: null,
    fetchCheckIns: jest.fn(),
    addItem: jest.fn(),
    hasCheckedInThisWeek: jest.fn(() => false),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CheckInScreen', () => {
  it('renders the "Start This Week\'s Check-In" button when hasCheckedInThisWeek is false', () => {
    mockUseCheckInsStore.mockReturnValue(makeStoreState({ hasCheckedInThisWeek: jest.fn(() => false) }));
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-start-button')).toBeTruthy();
  });

  it('renders "Submitted" status and no enabled start button when hasCheckedInThisWeek is true', () => {
    const submittedAt = new Date().toISOString();
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({
        items: [makeCheckIn({ submittedAt })],
        hasCheckedInThisWeek: jest.fn(() => true),
      }),
    );
    const { getByTestId, queryByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-submitted-label')).toBeTruthy();
    expect(queryByTestId('checkin-start-button')).toBeNull();
  });

  it('renders a history row per item with the wellness score averaged to 1 decimal', () => {
    // Average of 7+5+4+6+8+7+6 = 43 / 7 ≈ 6.1
    const checkIn = makeCheckIn({ _id: 'ci-1', sleepQuality: 7, stress: 5, fatigue: 4, hunger: 6, recovery: 8, energy: 7, digestion: 6 });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId, getByText } = render(<CheckInScreen />);
    expect(getByTestId('checkin-history-item-ci-1')).toBeTruthy();
    expect(getByText('6.1')).toBeTruthy();
  });

  it('renders "No check-ins yet." when items is empty and not loading', () => {
    mockUseCheckInsStore.mockReturnValue(makeStoreState({ items: [], loading: false, hasCheckedInThisWeek: jest.fn(() => false) }));
    const { getByText } = render(<CheckInScreen />);
    expect(getByText('No check-ins yet.')).toBeTruthy();
  });

  it('pressing a history row navigates with CheckInDetail and the tapped check-in', () => {
    const checkIn = makeCheckIn({ _id: 'ci-2' });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    fireEvent.press(getByTestId('checkin-history-item-ci-2'));
    expect(mockNavigate).toHaveBeenCalledWith('CheckInDetail', { checkIn });
  });
});
