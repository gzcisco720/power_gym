import { create } from 'zustand';
import { fetchBranding } from '../lib/api/branding.api';

interface BrandingState {
  gymName: string | null;
  logoUrl: string | null;
  fetchBranding(): Promise<void>;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  gymName: null,
  logoUrl: null,

  async fetchBranding(): Promise<void> {
    try {
      const data = await fetchBranding();
      set({ gymName: data.gymName, logoUrl: data.logoUrl });
    } catch {
      // Non-fatal — leave existing values
    }
  },
}));
