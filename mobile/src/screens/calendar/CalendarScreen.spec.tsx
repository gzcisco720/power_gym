/**
 * Stage 3 unit tests — CalendarScreen
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/calendar.store', () => ({
  useCalendarStore: jest.fn(),
}));

jest.mock('../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

jest.mock('../../stores/service-types.store', () => ({
  useServiceTypesStore: jest.fn(),
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

import { useCalendarStore } from '../../stores/calendar.store';
import { useMembersStore } from '../../stores/members.store';
import { useTrainersStore } from '../../stores/trainers.store';
import { useServiceTypesStore } from '../../stores/service-types.store';
import { useAuthStore } from '../../stores/auth.store';
import { CalendarScreen } from './CalendarScreen';
import { StaffSession } from '../../types/scheduled-sessions';

const mockUseCalendarStore = useCalendarStore as jest.MockedFunction<typeof useCalendarStore>;
const mockUseMembersStore = useMembersStore as jest.MockedFunction<typeof useMembersStore>;
const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;
const mockUseServiceTypesStore = useServiceTypesStore as jest.MockedFunction<typeof useServiceTypesStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

function makeSession(overrides: Partial<StaffSession> = {}): StaffSession {
  return {
    _id: 'sess1',
    date: '2026-07-15',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    trainerId: 'trainer1',
    trainerName: 'Jane Smith',
    memberIds: ['m1'],
    memberNames: ['Alice'],
    serviceTypeId: null,
    serviceTypeName: null,
    customServiceName: null,
    seriesId: null,
    isRecurring: false,
    ...overrides,
  };
}

function setupCalendarStore(overrides: {
  loading?: boolean;
  items?: StaffSession[];
  groupedByDay?: jest.Mock;
  fetch?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
  remove?: jest.Mock;
  range?: 'upcoming' | 'past';
} = {}) {
  const calendarState = {
    items: overrides.items ?? [],
    loading: overrides.loading ?? false,
    error: null,
    range: overrides.range ?? 'upcoming' as const,
    fetch: overrides.fetch ?? jest.fn().mockResolvedValue(undefined),
    groupedByDay: overrides.groupedByDay ?? jest.fn().mockReturnValue([]),
    create: overrides.create ?? jest.fn().mockResolvedValue(undefined),
    update: overrides.update ?? jest.fn().mockResolvedValue(undefined),
    remove: overrides.remove ?? jest.fn().mockResolvedValue(undefined),
  };

  mockUseCalendarStore.mockImplementation(
    (selector?: (s: typeof calendarState) => unknown) => {
      if (typeof selector === 'function') return selector(calendarState);
      return calendarState;
    },
  );

  return calendarState;
}

const MEMBERS_STATE = {
  members: [],
  loading: false,
  error: null,
  selectedMembers: {} as Record<string, never>,
  detailLoading: false,
  detailError: null,
  searchQuery: '',
  fetchMembers: jest.fn(),
  fetchMemberDetail: jest.fn(),
  filteredMembers: jest.fn().mockReturnValue([]),
  setSearchQuery: jest.fn(),
};

const TRAINERS_STATE = {
  trainers: [],
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  detailError: null,
  fetchTrainers: jest.fn(),
  fetchTrainerDetail: jest.fn(),
};

const SERVICE_TYPES_STATE = {
  items: [],
  filter: 'all' as const,
  loading: false,
  error: null,
  fetchServiceTypes: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  setFilter: jest.fn(),
};

function setupSupportStores(userRole: 'owner' | 'trainer' = 'owner') {
  mockUseMembersStore.mockImplementation(
    (selector?: (s: typeof MEMBERS_STATE) => unknown) => {
      if (typeof selector === 'function') return selector(MEMBERS_STATE);
      return MEMBERS_STATE;
    },
  );

  mockUseTrainersStore.mockImplementation(
    (selector?: (s: typeof TRAINERS_STATE) => unknown) => {
      if (typeof selector === 'function') return selector(TRAINERS_STATE);
      return TRAINERS_STATE;
    },
  );

  mockUseServiceTypesStore.mockImplementation(
    (selector?: (s: typeof SERVICE_TYPES_STATE) => unknown) => {
      if (typeof selector === 'function') return selector(SERVICE_TYPES_STATE);
      return SERVICE_TYPES_STATE;
    },
  );

  const authState = {
    accessToken: 'token',
    user: { id: 'u1', firstName: 'Owner', lastName: 'User', role: userRole, trainerId: null },
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    hydrate: jest.fn(),
  };

  mockUseAuthStore.mockImplementation(
    (selector?: (s: typeof authState) => unknown) => {
      if (typeof selector === 'function') return selector(authState);
      return authState;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupSupportStores();
});

describe('CalendarScreen', () => {
  it('renders skeleton rows while loading', () => {
    setupCalendarStore({ loading: true });
    const { getAllByTestId, queryByTestId } = render(<CalendarScreen />);
    expect(getAllByTestId('calendar-skeleton-row').length).toBeGreaterThan(0);
    expect(queryByTestId('calendar-agenda-section')).toBeNull();
  });

  it('renders day-grouped agenda after fetch', () => {
    const session = makeSession();
    setupCalendarStore({
      loading: false,
      items: [session],
      groupedByDay: jest.fn().mockReturnValue([
        { dateLabel: 'Tue, Jul 15', isoDate: '2026-07-15', sessions: [session] },
      ]),
    });
    const { getByText, getByTestId } = render(<CalendarScreen />);
    expect(getByTestId('calendar-agenda-section')).toBeTruthy();
    expect(getByText('Tue, Jul 15')).toBeTruthy();
    expect(getByTestId(`session-card-${session._id}`)).toBeTruthy();
  });

  it('shows empty state when upcoming range has no sessions', () => {
    setupCalendarStore({ loading: false, groupedByDay: jest.fn().mockReturnValue([]) });
    const { getByTestId } = render(<CalendarScreen />);
    expect(getByTestId('calendar-empty-state')).toBeTruthy();
  });

  it('tapping the add button opens SessionForm', () => {
    setupCalendarStore({ loading: false });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId('calendar-add-button'));
    expect(getByTestId('screen-SessionForm')).toBeTruthy();
  });

  it('toggling Past tab calls store.fetch with "past"', () => {
    const fetch = jest.fn().mockResolvedValue(undefined);
    setupCalendarStore({ loading: false, fetch });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId('calendar-tab-past'));
    expect(fetch).toHaveBeenCalledWith('past');
  });

  it('toggling Upcoming tab calls store.fetch with "upcoming"', () => {
    const fetch = jest.fn().mockResolvedValue(undefined);
    setupCalendarStore({ loading: false, range: 'past', fetch });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId('calendar-tab-upcoming'));
    expect(fetch).toHaveBeenCalledWith('upcoming');
  });

  it('tapping a session card opens SessionForm in edit mode', () => {
    const session = makeSession();
    setupCalendarStore({
      loading: false,
      items: [session],
      groupedByDay: jest.fn().mockReturnValue([
        { dateLabel: 'Tue, Jul 15', isoDate: '2026-07-15', sessions: [session] },
      ]),
    });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId(`session-card-${session._id}`));
    expect(getByTestId('screen-SessionForm')).toBeTruthy();
  });

  it('tapping delete on a session and confirming calls store.remove', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const session = makeSession();
    setupCalendarStore({
      loading: false,
      items: [session],
      groupedByDay: jest.fn().mockReturnValue([
        { dateLabel: 'Tue, Jul 15', isoDate: '2026-07-15', sessions: [session] },
      ]),
      remove,
    });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId(`session-delete-btn-${session._id}`));

    // Confirm dialog should appear; press confirm
    expect(getByTestId('delete-confirm-dialog')).toBeTruthy();
    fireEvent.press(getByTestId('delete-confirm-button'));

    // For single (non-series) session, should call remove with 'single'
    expect(remove).toHaveBeenCalledWith(session._id, 'single');
  });

  it('series session delete shows single-vs-series scope choice', () => {
    const session = makeSession({ seriesId: 'series-1' });
    setupCalendarStore({
      loading: false,
      items: [session],
      groupedByDay: jest.fn().mockReturnValue([
        { dateLabel: 'Tue, Jul 15', isoDate: '2026-07-15', sessions: [session] },
      ]),
    });
    const { getByTestId } = render(<CalendarScreen />);
    fireEvent.press(getByTestId(`session-delete-btn-${session._id}`));
    expect(getByTestId('delete-scope-single')).toBeTruthy();
    expect(getByTestId('delete-scope-series')).toBeTruthy();
  });
});
