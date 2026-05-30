import { create } from 'zustand';
import {
  fetchServiceTypes,
  createServiceType,
  updateServiceType,
} from '@/api/service-types';
import type { ServiceType, ServiceTypePayload } from '@/api/service-types';

export type { ServiceType };

interface ServiceTypesState {
  serviceTypes: ServiceType[];
  isLoading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
  create: (payload: ServiceTypePayload) => Promise<ServiceType>;
  update: (id: string, payload: Partial<ServiceTypePayload & { isActive: boolean }>) => Promise<ServiceType>;
}

export const useServiceTypesStore = create<ServiceTypesState>((set, get) => ({
  serviceTypes: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const serviceTypes = await fetchServiceTypes();
      set({ serviceTypes, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  create: async (payload: ServiceTypePayload) => {
    const created = await createServiceType(payload);
    set({ serviceTypes: [...get().serviceTypes, created] });
    return created;
  },

  update: async (id: string, payload: Partial<ServiceTypePayload & { isActive: boolean }>) => {
    const updated = await updateServiceType(id, payload);
    set({
      serviceTypes: get().serviceTypes.map((st) => (st._id === id ? updated : st)),
    });
    return updated;
  },
}));
