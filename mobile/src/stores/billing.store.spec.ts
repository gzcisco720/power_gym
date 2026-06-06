jest.mock('../lib/api/billing.api', () => ({
  getMySummary: jest.fn(),
  getBillingSummary: jest.fn(),
  getMemberBilling: jest.fn(),
}));

import * as billingApi from '../lib/api/billing.api';
import { useBillingStore } from './billing.store';
import { MyBillingResponse, BillingSummaryResponse } from '../types/billing';

const mockGetMySummary = billingApi.getMySummary as jest.MockedFunction<typeof billingApi.getMySummary>;
const mockGetBillingSummary = billingApi.getBillingSummary as jest.MockedFunction<typeof billingApi.getBillingSummary>;
const mockGetMemberBilling = billingApi.getMemberBilling as jest.MockedFunction<typeof billingApi.getMemberBilling>;

const FROM = '2026-06-01T00:00:00.000Z';
const TO = '2026-06-30T23:59:59.999Z';

const MOCK_MY_BILLING: MyBillingResponse = {
  memberId: 'mem1',
  from: FROM,
  to: TO,
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

const MOCK_SUMMARY: BillingSummaryResponse = {
  members: [
    {
      memberId: 'mem1',
      name: 'Alice Smith',
      trainerName: 'Bob Jones',
      sessionsCount: 1,
      totalAmount: 60,
      currency: 'AUD',
    },
  ],
  grandTotal: 60,
  currency: 'AUD',
};

function resetStore() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  useBillingStore.setState({
    period: { from, to, label },
    myData: null,
    summaryData: null,
    myLoading: false,
    summaryLoading: false,
    myError: null,
    summaryError: null,
    memberData: null,
    memberLoading: false,
    memberError: null,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useBillingStore', () => {
  describe('fetchMy', () => {
    it('sets myData on success and clears loading', async () => {
      mockGetMySummary.mockResolvedValueOnce(MOCK_MY_BILLING);

      await useBillingStore.getState().fetchMy(FROM, TO);

      const state = useBillingStore.getState();
      expect(state.myData).toEqual(MOCK_MY_BILLING);
      expect(state.myLoading).toBe(false);
      expect(state.myError).toBeNull();
    });

    it('sets error string and clears loading when the api call rejects', async () => {
      mockGetMySummary.mockRejectedValueOnce(new Error('Network failure'));

      await useBillingStore.getState().fetchMy(FROM, TO);

      const state = useBillingStore.getState();
      expect(state.myLoading).toBe(false);
      expect(state.myError).toBe('Network failure');
      expect(state.myData).toBeNull();
    });
  });

  describe('fetchSummary', () => {
    it('sets summaryData on success and clears loading', async () => {
      mockGetBillingSummary.mockResolvedValueOnce(MOCK_SUMMARY);

      await useBillingStore.getState().fetchSummary(FROM, TO);

      const state = useBillingStore.getState();
      expect(state.summaryData).toEqual(MOCK_SUMMARY);
      expect(state.summaryLoading).toBe(false);
      expect(state.summaryError).toBeNull();
    });
  });

  describe('setPeriod', () => {
    it('a prev month change updates period state to the correct month boundaries (1st 00:00 → last day 23:59:59.999)', () => {
      // Start at June 2026
      const juneFrom = new Date(2026, 5, 1);
      const juneTo = new Date(2026, 5, 30, 23, 59, 59, 999);
      useBillingStore.setState({
        period: { from: juneFrom, to: juneTo, label: 'June 2026' },
      });

      useBillingStore.getState().setPeriod('prev');

      const state = useBillingStore.getState();
      expect(state.period.from.getFullYear()).toBe(2026);
      expect(state.period.from.getMonth()).toBe(4); // May = 4
      expect(state.period.from.getDate()).toBe(1);
      expect(state.period.from.getHours()).toBe(0);
      expect(state.period.from.getMinutes()).toBe(0);
      expect(state.period.to.getMonth()).toBe(4); // May
      expect(state.period.to.getDate()).toBe(31);
      expect(state.period.to.getHours()).toBe(23);
      expect(state.period.to.getMinutes()).toBe(59);
      expect(state.period.to.getSeconds()).toBe(59);
      expect(state.period.to.getMilliseconds()).toBe(999);
    });

    it('a next month change updates period state to the correct month boundaries', () => {
      // Start at June 2026
      const juneFrom = new Date(2026, 5, 1);
      const juneTo = new Date(2026, 5, 30, 23, 59, 59, 999);
      useBillingStore.setState({
        period: { from: juneFrom, to: juneTo, label: 'June 2026' },
      });

      useBillingStore.getState().setPeriod('next');

      const state = useBillingStore.getState();
      expect(state.period.from.getFullYear()).toBe(2026);
      expect(state.period.from.getMonth()).toBe(6); // July = 6
      expect(state.period.from.getDate()).toBe(1);
      expect(state.period.to.getMonth()).toBe(6); // July
      expect(state.period.to.getDate()).toBe(31);
      expect(state.period.to.getHours()).toBe(23);
      expect(state.period.to.getMinutes()).toBe(59);
      expect(state.period.to.getSeconds()).toBe(59);
      expect(state.period.to.getMilliseconds()).toBe(999);
    });
  });

  describe('fetchMember', () => {
    it('populates memberData and clears memberLoading on success', async () => {
      mockGetMemberBilling.mockResolvedValueOnce(MOCK_MY_BILLING);

      await useBillingStore.getState().fetchMember('mem1', FROM, TO);

      const state = useBillingStore.getState();
      expect(state.memberData).toEqual(MOCK_MY_BILLING);
      expect(state.memberLoading).toBe(false);
      expect(state.memberError).toBeNull();
    });

    it('sets memberError on api failure', async () => {
      mockGetMemberBilling.mockRejectedValueOnce(new Error('Request failed'));

      await useBillingStore.getState().fetchMember('mem1', FROM, TO);

      const state = useBillingStore.getState();
      expect(state.memberLoading).toBe(false);
      expect(state.memberError).toBe('Request failed');
      expect(state.memberData).toBeNull();
    });
  });
});
