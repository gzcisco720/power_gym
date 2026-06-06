jest.mock('../lib/api/check-ins.api', () => ({
  fetchMemberPhotos: jest.fn(),
}));

import * as checkInsApi from '../lib/api/check-ins.api';
import { useMemberPhotosStore } from './member-photos.store';
import { MemberPhoto } from '../types/check-ins';

const mockFetchMemberPhotos = checkInsApi.fetchMemberPhotos as jest.MockedFunction<
  typeof checkInsApi.fetchMemberPhotos
>;

const MOCK_PHOTOS: MemberPhoto[] = [
  {
    key: 'ci1-0',
    photoUrl: 'https://example.com/photo1.jpg',
    submittedAt: '2026-06-05T10:00:00.000Z',
    weight: 80,
  },
  {
    key: 'ci1-1',
    photoUrl: 'https://example.com/photo2.jpg',
    submittedAt: '2026-06-05T10:00:00.000Z',
    weight: 80,
  },
];

function resetStore() {
  useMemberPhotosStore.setState({
    photosByMember: {},
    loadingByMember: {},
    errorByMember: {},
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('useMemberPhotosStore', () => {
  describe('fetchPhotos', () => {
    it('populates photos[memberId] and sets loading false on success', async () => {
      mockFetchMemberPhotos.mockResolvedValueOnce(MOCK_PHOTOS);

      await useMemberPhotosStore.getState().fetchPhotos('mem1');

      const state = useMemberPhotosStore.getState();
      expect(state.photosByMember['mem1']).toEqual(MOCK_PHOTOS);
      expect(state.loadingByMember['mem1']).toBe(false);
      expect(state.errorByMember['mem1']).toBeNull();
    });

    it('sets error and clears loading when the api call rejects', async () => {
      mockFetchMemberPhotos.mockRejectedValueOnce(new Error('Network error'));

      await useMemberPhotosStore.getState().fetchPhotos('mem1');

      const state = useMemberPhotosStore.getState();
      expect(state.loadingByMember['mem1']).toBe(false);
      expect(state.errorByMember['mem1']).toBe('Network error');
      expect(state.photosByMember['mem1']).toBeUndefined();
    });
  });
});
