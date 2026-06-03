/**
 * Unit tests — BillingScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../stores/billing.store', () => ({
  useBillingStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '../../stores/auth.store';
import { useBillingStore } from '../../stores/billing.store';
import { MyBillingResponse, BillingSummaryResponse, BillingPeriod } from '../../types/billing';
import { BillingScreen } from './BillingScreen';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseBillingStore = useBillingStore as jest.MockedFunction<typeof useBillingStore>;

function makeAuthState(role: 'owner' | 'trainer' | 'member') {
  const user = { id: 'u1', firstName: 'Jane', lastName: 'Doe', role, trainerId: null };
  const state = {
    user,
    accessToken: 'token',
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    hydrate: jest.fn(),
  };
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
}

const BASE_PERIOD: BillingPeriod = {
  from: new Date(2026, 5, 1),
  to: new Date(2026, 5, 30, 23, 59, 59, 999),
  label: 'June 2026',
};

const MY_BILLING: MyBillingResponse = {
  memberId: 'mem1',
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-06-30T23:59:59.999Z',
  total: 60,
  count: 1,
  currency: 'AUD',
  lines: [
    {
      sessionId: 'sess1',
      date: '2026-06-05T00:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
      serviceTypeName: 'Personal Training',
      price: 60,
      currency: 'AUD',
    },
  ],
};

const SUMMARY: BillingSummaryResponse = {
  members: [
    {
      memberId: 'mem1',
      name: 'Alice Smith',
      trainerName: 'Bob Jones',
      sessionsCount: 2,
      totalAmount: 120,
      currency: 'AUD',
    },
  ],
  grandTotal: 120,
  currency: 'AUD',
};

function makeMemberStoreState(overrides: Partial<ReturnType<typeof useBillingStore>> = {}) {
  return {
    period: BASE_PERIOD,
    myData: MY_BILLING,
    myLoading: false,
    myError: null,
    summaryData: null,
    summaryLoading: false,
    summaryError: null,
    setPeriod: jest.fn(),
    fetchMy: jest.fn(),
    fetchSummary: jest.fn(),
    ...overrides,
  };
}

function makeOwnerStoreState(overrides: Partial<ReturnType<typeof useBillingStore>> = {}) {
  return {
    period: BASE_PERIOD,
    myData: null,
    myLoading: false,
    myError: null,
    summaryData: SUMMARY,
    summaryLoading: false,
    summaryError: null,
    setPeriod: jest.fn(),
    fetchMy: jest.fn(),
    fetchSummary: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BillingScreen', () => {
  it('renders MemberBilling (testID billing-line list) when auth store role is member', () => {
    makeAuthState('member');
    mockUseBillingStore.mockReturnValue(makeMemberStoreState());

    const { getAllByTestId, queryAllByTestId } = render(<BillingScreen />);

    expect(getAllByTestId('billing-line').length).toBeGreaterThan(0);
    expect(queryAllByTestId('billing-member-row')).toHaveLength(0);
  });

  it('renders OwnerTrainerBilling (testID billing-member-row + billing-grand-total) when auth store role is owner', () => {
    makeAuthState('owner');
    mockUseBillingStore.mockReturnValue(makeOwnerStoreState());

    const { getAllByTestId, getByTestId } = render(<BillingScreen />);

    expect(getAllByTestId('billing-member-row').length).toBeGreaterThan(0);
    expect(getByTestId('billing-grand-total')).toBeTruthy();
  });

  it('shows the empty-state message (testID billing-empty) when the period has no billable sessions for member', () => {
    makeAuthState('member');
    mockUseBillingStore.mockReturnValue(
      makeMemberStoreState({
        myData: {
          ...MY_BILLING,
          total: 0,
          count: 0,
          lines: [],
        },
      }),
    );

    const { getByTestId } = render(<BillingScreen />);

    expect(getByTestId('billing-empty')).toBeTruthy();
  });

  it('shows the empty-state message when the period has no members for owner', () => {
    makeAuthState('owner');
    mockUseBillingStore.mockReturnValue(
      makeOwnerStoreState({
        summaryData: { members: [], grandTotal: 0, currency: 'AUD' },
      }),
    );

    const { getByTestId } = render(<BillingScreen />);

    expect(getByTestId('billing-empty')).toBeTruthy();
  });
});
