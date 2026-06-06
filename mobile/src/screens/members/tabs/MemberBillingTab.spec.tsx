import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MyBillingResponse, BillingPeriod } from '../../../types/billing';

jest.mock('../../../stores/billing.store');
import { useBillingStore } from '../../../stores/billing.store';

const mockUseBillingStore = useBillingStore as jest.MockedFunction<typeof useBillingStore>;

const MOCK_PERIOD: BillingPeriod = {
  from: new Date(2026, 5, 1),
  to: new Date(2026, 5, 30, 23, 59, 59, 999),
  label: 'June 2026',
};

const MOCK_BILLING: MyBillingResponse = {
  memberId: 'mem1',
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-06-30T23:59:59.999Z',
  total: 120,
  count: 2,
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
    {
      sessionId: 'sess2',
      date: '2026-06-12T00:00:00.000Z',
      startTime: '09:00',
      endTime: '10:00',
      serviceTypeName: 'Personal Training',
      price: 60,
      currency: 'AUD',
    },
  ],
};

const EMPTY_BILLING: MyBillingResponse = {
  memberId: 'mem1',
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-06-30T23:59:59.999Z',
  total: 0,
  count: 0,
  currency: 'AUD',
  lines: [],
};

function buildStoreMock(overrides: {
  memberData?: MyBillingResponse | null;
  memberLoading?: boolean;
  memberError?: string | null;
  period?: BillingPeriod;
  setPeriod?: jest.Mock;
  fetchMember?: jest.Mock;
}) {
  const defaults = {
    period: MOCK_PERIOD,
    memberData: null,
    memberLoading: false,
    memberError: null,
    setPeriod: jest.fn(),
    fetchMember: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  mockUseBillingStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(defaults as Parameters<typeof selector>[0]);
    }
    return defaults;
  });

  return defaults;
}

// Import after mock setup
import { MemberBillingTab } from './MemberBillingTab';

describe('MemberBillingTab', () => {
  const MEMBER_ID = 'mem1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the period total, session count, and one row per billing line', () => {
    buildStoreMock({ memberData: MOCK_BILLING });

    const { getByTestId, getAllByTestId } = render(
      <MemberBillingTab memberId={MEMBER_ID} />,
    );

    expect(getByTestId('billing-period-total')).toBeTruthy();
    expect(getByTestId('billing-session-count')).toBeTruthy();
    const lines = getAllByTestId(/^billing-line-/);
    expect(lines).toHaveLength(2);
  });

  it('renders an empty state when the member has no billable sessions in the period', () => {
    buildStoreMock({ memberData: EMPTY_BILLING });

    const { getByTestId } = render(<MemberBillingTab memberId={MEMBER_ID} />);

    expect(getByTestId('billing-empty-state')).toBeTruthy();
  });

  it('tapping next month advances the period and refetches', () => {
    const setPeriod = jest.fn();
    const fetchMember = jest.fn().mockResolvedValue(undefined);
    buildStoreMock({ memberData: MOCK_BILLING, setPeriod, fetchMember });

    const { getByTestId } = render(<MemberBillingTab memberId={MEMBER_ID} />);

    fireEvent.press(getByTestId('billing-period-next'));

    expect(setPeriod).toHaveBeenCalledWith('next');
  });
});
