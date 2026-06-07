import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberPhoto } from '../../../types/check-ins';

jest.mock('../../../stores/member-photos.store');
import { useMemberPhotosStore } from '../../../stores/member-photos.store';

const mockUseStore = useMemberPhotosStore as jest.MockedFunction<typeof useMemberPhotosStore>;

function makePhoto(overrides: Partial<MemberPhoto> = {}): MemberPhoto {
  return {
    key: 'ci1-0',
    photoUrl: 'https://example.com/photo1.jpg',
    submittedAt: '2026-06-05T10:00:00.000Z',
    weight: 80,
    ...overrides,
  };
}

function buildStoreMock(overrides: {
  photos?: MemberPhoto[];
  loading?: boolean;
  error?: string | null;
  fetchPhotos?: jest.Mock;
}) {
  const photosByMember: Record<string, MemberPhoto[]> = {};
  const loadingByMember: Record<string, boolean> = {};
  const errorByMember: Record<string, string | null> = {};

  if (overrides.photos !== undefined) photosByMember['mem1'] = overrides.photos;
  loadingByMember['mem1'] = overrides.loading ?? false;
  errorByMember['mem1'] = overrides.error ?? null;

  const state = {
    photosByMember,
    loadingByMember,
    errorByMember,
    fetchPhotos: overrides.fetchPhotos ?? jest.fn().mockResolvedValue(undefined),
  };

  mockUseStore.mockImplementation((selector) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });

  return state;
}

// Import after mocks are set up
import { MemberPhotosTab } from './MemberPhotosTab';

describe('MemberPhotosTab', () => {
  const MEMBER_ID = 'mem1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one image per photo item with an accessible date label', () => {
    buildStoreMock({
      photos: [
        makePhoto({ key: 'ci1-0', photoUrl: 'https://example.com/photo1.jpg', submittedAt: '2026-06-05T10:00:00.000Z' }),
        makePhoto({ key: 'ci1-1', photoUrl: 'https://example.com/photo2.jpg', submittedAt: '2026-06-04T10:00:00.000Z' }),
      ],
    });

    const { getByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);

    expect(getByTestId('photo-item-ci1-0')).toBeTruthy();
    expect(getByTestId('photo-item-ci1-1')).toBeTruthy();
  });

  it('shows the "No photos yet" empty state when the photo list is empty', () => {
    buildStoreMock({ photos: [] });

    const { getByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);

    expect(getByTestId('photos-empty-state')).toBeTruthy();
  });

  it('tapping a photo opens the context modal showing its date and weight', () => {
    buildStoreMock({
      photos: [
        makePhoto({ key: 'ci1-0', submittedAt: '2026-06-05T10:00:00.000Z', weight: 80 }),
      ],
    });

    const { getByTestId, queryByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);

    // Modal not visible initially
    expect(queryByTestId('photo-modal')).toBeNull();

    // Tap a photo
    fireEvent.press(getByTestId('photo-item-ci1-0'));

    // Modal is now visible
    expect(getByTestId('photo-modal')).toBeTruthy();
    expect(getByTestId('photo-modal-weight')).toBeTruthy();
  });

  describe('photo comparison', () => {
    it('shows a Select button when 2 or more photos exist', () => {
      buildStoreMock({
        photos: [
          makePhoto({ key: 'p1' }),
          makePhoto({ key: 'p2' }),
        ],
      });
      const { getByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);
      expect(getByTestId('photos-select-button')).toBeTruthy();
    });

    it('does not show Select button when fewer than 2 photos', () => {
      buildStoreMock({ photos: [makePhoto({ key: 'p1' })] });
      const { queryByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);
      expect(queryByTestId('photos-select-button')).toBeNull();
    });

    it('entering select mode shows Cancel and selection hint', () => {
      buildStoreMock({
        photos: [makePhoto({ key: 'p1' }), makePhoto({ key: 'p2' })],
      });
      const { getByTestId, queryByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);
      fireEvent.press(getByTestId('photos-select-button'));
      expect(getByTestId('photos-cancel-button')).toBeTruthy();
      expect(queryByTestId('photos-select-button')).toBeNull();
    });

    it('shows Compare button only after 2 photos are selected', () => {
      buildStoreMock({
        photos: [makePhoto({ key: 'p1' }), makePhoto({ key: 'p2' })],
      });
      const { getByTestId, queryByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);
      fireEvent.press(getByTestId('photos-select-button'));

      // 0 selected: no compare button
      expect(queryByTestId('photos-compare-button')).toBeNull();

      // Select first
      fireEvent.press(getByTestId('photo-item-p1'));
      expect(queryByTestId('photos-compare-button')).toBeNull();

      // Select second
      fireEvent.press(getByTestId('photo-item-p2'));
      expect(getByTestId('photos-compare-button')).toBeTruthy();
    });

    it('tapping Compare opens the compare modal', () => {
      buildStoreMock({
        photos: [makePhoto({ key: 'p1' }), makePhoto({ key: 'p2' })],
      });
      const { getByTestId, queryByTestId } = render(<MemberPhotosTab memberId={MEMBER_ID} />);
      fireEvent.press(getByTestId('photos-select-button'));
      fireEvent.press(getByTestId('photo-item-p1'));
      fireEvent.press(getByTestId('photo-item-p2'));

      expect(queryByTestId('photos-compare-modal')).toBeNull();
      fireEvent.press(getByTestId('photos-compare-button'));
      expect(getByTestId('photos-compare-modal')).toBeTruthy();
    });
  });
});
