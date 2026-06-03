import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { checkIn: mockCheckIn } }),
}));

import { CheckIn } from '../../../src/types/check-ins';
import { CheckInDetailScreen } from '../../../src/screens/check-in/CheckInDetailScreen';

let mockCheckIn: CheckIn;

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    _id: 'ci-1',
    memberId: 'member-1',
    trainerId: 'trainer-1',
    submittedAt: '2026-06-02T10:00:00.000Z',
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
    createdAt: '2026-06-02T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CheckInDetailScreen', () => {
  it('renders only body-metric fields that have non-null values', () => {
    mockCheckIn = makeCheckIn({ weight: 75.5, waist: null, steps: 8000, exerciseMinutes: null, walkRunDistance: null, sleepHours: null });
    const { getByText, queryByText } = render(<CheckInDetailScreen />);
    // Weight renders with unit suffix → text node is "75.5" + nested " kg"
    expect(getByText('75.5', { exact: false })).toBeTruthy();
    // Steps renders with no unit
    expect(getByText('8000')).toBeTruthy();
    // Waist and others are null → their labels should not appear
    expect(queryByText('Waist')).toBeNull();
  });

  it('renders the stuckToDiet badge matching the check-in value — yes', () => {
    mockCheckIn = makeCheckIn({ stuckToDiet: 'yes' });
    const { getByText } = render(<CheckInDetailScreen />);
    expect(getByText('Yes')).toBeTruthy();
  });

  it('renders the stuckToDiet badge matching the check-in value — partial', () => {
    mockCheckIn = makeCheckIn({ stuckToDiet: 'partial' });
    const { getByText } = render(<CheckInDetailScreen />);
    expect(getByText('Partial')).toBeTruthy();
  });

  it('renders the stuckToDiet badge matching the check-in value — no', () => {
    mockCheckIn = makeCheckIn({ stuckToDiet: 'no' });
    const { getByText } = render(<CheckInDetailScreen />);
    expect(getByText('No')).toBeTruthy();
  });
});
