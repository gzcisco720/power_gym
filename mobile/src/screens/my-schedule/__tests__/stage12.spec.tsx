/**
 * Stage 12 unit tests — MyScheduleScreen
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/scheduled-sessions.store', () => ({
  useScheduledSessionsStore: jest.fn(),
}));

import { useScheduledSessionsStore } from '../../../stores/scheduled-sessions.store';
import { MyScheduleScreen } from '../MyScheduleScreen';

const mockUseStore = useScheduledSessionsStore as jest.MockedFunction<
  typeof useScheduledSessionsStore
>;

function setupLoading() {
  mockUseStore.mockReturnValue({
    items: [],
    loading: true,
    error: null,
    fetchSessions: jest.fn().mockResolvedValue(undefined),
    getUpcoming: jest.fn().mockReturnValue([]),
    getPast: jest.fn().mockReturnValue([]),
  } as ReturnType<typeof useScheduledSessionsStore>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MyScheduleScreen', () => {
  describe('loading', () => {
    it('renders Skeleton', () => {
      setupLoading();

      const { getAllByTestId } = render(<MyScheduleScreen />);

      // Reusables Skeleton rows must be rendered (testID="schedule-skeleton-row")
      const skeletons = getAllByTestId('schedule-skeleton-row');
      expect(skeletons.length).toBeGreaterThan(0);
      // Each skeleton must have the animate-pulse class from the Skeleton component
      const firstSkeleton = skeletons[0];
      expect(firstSkeleton.props.className).toContain('animate-pulse');
    });
  });
});
