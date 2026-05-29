import { create } from 'zustand';
import * as billingApi from '@/api/billing';

interface BillingState {
  serviceTypes: billingApi.ServiceType[];
  billingLines: billingApi.BillingLine[];
  isLoading: boolean;
  error: string | null;
  fetchServiceTypes: () => Promise<void>;
  createServiceType: (data: { name: string; durationMin: number; pricePerSession: number; note?: string }) => Promise<void>;
  deleteServiceType: (id: string) => Promise<void>;
  fetchMemberBilling: (memberId: string, from?: string, to?: string) => Promise<void>;
}

export const useBillingStore = create<BillingState>((set) => ({
  serviceTypes: [],
  billingLines: [],
  isLoading: false,
  error: null,

  fetchServiceTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await billingApi.fetchActiveServiceTypes();
      set({ serviceTypes: result.serviceTypes, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createServiceType: async (data) => {
    try {
      const result = await billingApi.createServiceType(data);
      set((s) => ({ serviceTypes: [...s.serviceTypes, result.serviceType] }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteServiceType: async (id) => {
    try {
      await billingApi.deleteServiceType(id);
      set((s) => ({ serviceTypes: s.serviceTypes.filter((st) => st._id !== id) }));
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  fetchMemberBilling: async (memberId, from, to) => {
    set({ isLoading: true, error: null });
    try {
      const result = await billingApi.fetchMemberBilling(memberId, from, to);
      set({ billingLines: result.transactions, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));
