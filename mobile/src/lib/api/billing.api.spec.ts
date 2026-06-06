jest.mock('./client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

import { apiClient } from './client';
import { getMySummary, getBillingSummary, getMemberBilling } from './billing.api';
import { MyBillingResponse, BillingSummaryResponse } from '../../types/billing';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const FROM = '2026-06-01T00:00:00.000Z';
const TO = '2026-06-30T23:59:59.999Z';

const MOCK_MY_BILLING: MyBillingResponse = {
  memberId: 'mem1',
  from: FROM,
  to: TO,
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

const MOCK_SUMMARY: BillingSummaryResponse = {
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('billing.api', () => {
  describe('getMySummary', () => {
    it('calls GET /billing/my with from and to ISO query params and returns the response body', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_MY_BILLING });

      const result = await getMySummary(FROM, TO);

      expect(mockGet).toHaveBeenCalledWith('/billing/my', {
        params: { from: FROM, to: TO },
      });
      expect(result).toEqual(MOCK_MY_BILLING);
    });
  });

  describe('getBillingSummary', () => {
    it('calls GET /billing/summary with from and to ISO query params and returns the response body', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_SUMMARY });

      const result = await getBillingSummary(FROM, TO);

      expect(mockGet).toHaveBeenCalledWith('/billing/summary', {
        params: { from: FROM, to: TO },
      });
      expect(result).toEqual(MOCK_SUMMARY);
    });
  });

  describe('getMemberBilling', () => {
    it('calls GET /billing/members/:memberId with from and to params and returns the response body', async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_MY_BILLING });

      const result = await getMemberBilling('mem1', FROM, TO);

      expect(mockGet).toHaveBeenCalledWith('/billing/members/mem1', {
        params: { from: FROM, to: TO },
      });
      expect(result).toEqual(MOCK_MY_BILLING);
    });
  });
});
