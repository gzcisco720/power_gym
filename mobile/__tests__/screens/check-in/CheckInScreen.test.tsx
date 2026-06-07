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
    expect(getByTestId('checkin-this-week-avg')).toBeTruthy();
    expect(queryByTestId('checkin-start-button')).toBeNull();
  });

  it('renders a history row per item with the wellness score averaged to 1 decimal', () => {
    // Formula: (sleepQuality + energy + recovery + (10-stress) + (10-fatigue) + hunger + digestion) / 7
    // = (7 + 7 + 8 + 5 + 6 + 6 + 6) / 7 = 45/7 ≈ 6.4
    const checkIn = makeCheckIn({ _id: 'ci-1', sleepQuality: 7, stress: 5, fatigue: 4, hunger: 6, recovery: 8, energy: 7, digestion: 6 });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-history-item-ci-1')).toBeTruthy();
    // Wellness avg shows in the this-week card and in the history row
    expect(getByTestId('checkin-this-week-avg').props.children).toBe('6.4');
  });

  it('shows a consistency heatmap with cells when items exist', () => {
    const checkIn = makeCheckIn({ _id: 'ci-1' });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('consistency-heatmap')).toBeTruthy();
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

  it('history row shows diet badge "On track" for stuckToDiet=yes', () => {
    const checkIn = makeCheckIn({ _id: 'ci-3', stuckToDiet: 'yes', weight: null });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-diet-badge-ci-3')).toBeTruthy();
    expect(getByTestId('checkin-diet-badge-ci-3').props.children).toBe('On track');
  });

  it('history row shows diet badge "Partial" for stuckToDiet=partial', () => {
    const checkIn = makeCheckIn({ _id: 'ci-4', stuckToDiet: 'partial', weight: null });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-diet-badge-ci-4').props.children).toBe('Partial');
  });

  it('history row shows diet badge "Off track" for stuckToDiet=no', () => {
    const checkIn = makeCheckIn({ _id: 'ci-5', stuckToDiet: 'no', weight: null });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    expect(getByTestId('checkin-diet-badge-ci-5').props.children).toBe('Off track');
  });

  it('history row shows weight "X kg" when weight is non-null', () => {
    const checkIn = makeCheckIn({ _id: 'ci-6', weight: 85.5, stuckToDiet: 'yes' });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { getByTestId } = render(<CheckInScreen />);
    const weightEl = getByTestId('checkin-weight-ci-6');
    expect(weightEl).toBeTruthy();
    expect(weightEl.props.children).toContain('85.5');
  });

  it('history row does not show weight element when weight is null', () => {
    const checkIn = makeCheckIn({ _id: 'ci-7', weight: null, stuckToDiet: 'yes' });
    mockUseCheckInsStore.mockReturnValue(
      makeStoreState({ items: [checkIn], hasCheckedInThisWeek: jest.fn(() => true) }),
    );
    const { queryByTestId } = render(<CheckInScreen />);
    expect(queryByTestId('checkin-weight-ci-7')).toBeNull();
  });
});
