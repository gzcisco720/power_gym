import { create } from 'zustand';
import { fetchMemberPhotos } from '../lib/api/check-ins.api';
import { MemberPhoto } from '../types/check-ins';

interface MemberPhotosState {
  photosByMember: Record<string, MemberPhoto[]>;
  loadingByMember: Record<string, boolean>;
  errorByMember: Record<string, string | null>;

  fetchPhotos(memberId: string): Promise<void>;
}

export const useMemberPhotosStore = create<MemberPhotosState>((set) => ({
  photosByMember: {},
  loadingByMember: {},
  errorByMember: {},

  async fetchPhotos(memberId: string): Promise<void> {
    set((state) => ({
      loadingByMember: { ...state.loadingByMember, [memberId]: true },
      errorByMember: { ...state.errorByMember, [memberId]: null },
    }));
    try {
      const photos = await fetchMemberPhotos(memberId);
      set((state) => ({
        photosByMember: { ...state.photosByMember, [memberId]: photos },
        loadingByMember: { ...state.loadingByMember, [memberId]: false },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set((state) => ({
        loadingByMember: { ...state.loadingByMember, [memberId]: false },
        errorByMember: { ...state.errorByMember, [memberId]: message },
      }));
    }
  },
}));
