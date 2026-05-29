import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/api/billing', () => ({
  fetchActiveServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  deleteServiceType: vi.fn(),
  fetchMemberBilling: vi.fn(),
}));

import * as billingApi from '@/api/billing';
import { useBillingStore } from '@/stores/billingStore';

const mockServiceType: billingApi.ServiceType = {
  _id: 'st1',
  name: 'PT Session',
  durationMin: 60,
  pricePerSession: 100,
  currency: 'AUD',
  note: null,
  isActive: true,
  createdBy: 'o1',
};

const mockBillingLine: billingApi.BillingLine = {
  _id: 'bl1',
  memberId: 'm1',
  serviceTypeId: 'st1',
  serviceTypeName: 'PT Session',
  pricePerSession: 100,
  sessionDate: '2026-06-01T09:00:00Z',
};

beforeEach(() => {
  useBillingStore.setState({ serviceTypes: [], billingLines: [], isLoading: false, error: null });
  vi.clearAllMocks();
});

describe('billingStore', () => {
  describe('fetchServiceTypes', () => {
    it('populates serviceTypes', async () => {
      vi.mocked(billingApi.fetchActiveServiceTypes).mockResolvedValueOnce({ serviceTypes: [mockServiceType] });

      await useBillingStore.getState().fetchServiceTypes();

      expect(useBillingStore.getState().serviceTypes).toEqual([mockServiceType]);
    });
  });

  describe('createServiceType', () => {
    it('appends a new service type', async () => {
      useBillingStore.setState({ serviceTypes: [mockServiceType] });
      const newType: billingApi.ServiceType = { ...mockServiceType, _id: 'st2', name: 'Group' };
      vi.mocked(billingApi.createServiceType).mockResolvedValueOnce({ serviceType: newType });

      await useBillingStore.getState().createServiceType({ name: 'Group', durationMin: 45, pricePerSession: 50 });

      const types = useBillingStore.getState().serviceTypes;
      expect(types).toHaveLength(2);
      expect(types[1]).toEqual(newType);
    });
  });

  describe('deleteServiceType', () => {
    it('removes the service type by id', async () => {
      useBillingStore.setState({ serviceTypes: [mockServiceType] });
      vi.mocked(billingApi.deleteServiceType).mockResolvedValueOnce({ success: true });

      await useBillingStore.getState().deleteServiceType('st1');

      expect(useBillingStore.getState().serviceTypes).toHaveLength(0);
    });
  });

  describe('fetchMemberBilling', () => {
    it('populates billing lines for a member id', async () => {
      vi.mocked(billingApi.fetchMemberBilling).mockResolvedValueOnce({ transactions: [mockBillingLine] });

      await useBillingStore.getState().fetchMemberBilling('m1');

      expect(useBillingStore.getState().billingLines).toEqual([mockBillingLine]);
    });
  });
});
