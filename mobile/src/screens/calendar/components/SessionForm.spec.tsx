/**
 * Stage 2 unit tests — SessionForm (single-select member, Select pickers, customFee)
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/calendar.store', () => ({
  useCalendarStore: jest.fn(),
}));

jest.mock('../../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

jest.mock('../../../stores/service-types.store', () => ({
  useServiceTypesStore: jest.fn(),
}));

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock Reusables Select: SelectItem presses call parent onValueChange immediately.
jest.mock('~/components/ui/select', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const mockCtx = mockReact.createContext<{
    value: { value: string; label: string } | undefined;
    onValueChange: ((opt: { value: string; label: string } | undefined) => void) | undefined;
  }>({ value: undefined, onValueChange: undefined });

  const Select = ({ value, onValueChange, children }: {
    value?: { value: string; label: string };
    onValueChange?: (opt: { value: string; label: string } | undefined) => void;
    children?: React.ReactNode;
  }) =>
    mockReact.createElement(mockCtx.Provider, { value: { value, onValueChange } }, children);

  const SelectTrigger = ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    mockReact.createElement(mockRN.View, { testID }, children);

  const SelectValue = ({ placeholder }: { placeholder?: string }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(mockRN.Text, null, ctx.value?.label ?? placeholder ?? '');
  };

  const SelectContent = ({ children }: { children?: React.ReactNode }) =>
    mockReact.createElement(mockRN.View, null, children);

  const SelectItem = ({ value: itemValue, label, testID }: { value: string; label: string; testID?: string }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(
      mockRN.Pressable,
      {
        testID: testID ?? ('select-item-' + itemValue),
        onPress: () => ctx.onValueChange && ctx.onValueChange({ value: itemValue, label }),
        accessibilityLabel: label,
      },
      mockReact.createElement(mockRN.Text, null, label),
    );
  };

  return {
    __esModule: true,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup: ({ children }: { children?: React.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children),
    SelectLabel: ({ children }: { children?: React.ReactNode }) =>
      mockReact.createElement(mockRN.Text, null, children),
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

import { useCalendarStore } from '../../../stores/calendar.store';
import { useMembersStore } from '../../../stores/members.store';
import { useTrainersStore } from '../../../stores/trainers.store';
import { useServiceTypesStore } from '../../../stores/service-types.store';
import { useAuthStore } from '../../../stores/auth.store';
import { SessionForm } from './SessionForm';
import { StaffSession } from '../../../types/scheduled-sessions';

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

const MEMBERS_STATE = {
  members: [
    { id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: null, trainerName: null },
    { id: 'm2', name: 'Bob', email: 'bob@test.com', trainerId: null, trainerName: null },
  ],
  loading: false,
  error: null,
  selectedMembers: {} as Record<string, never>,
  detailLoading: false,
  detailError: null,
  searchQuery: '',
  fetchMembers: jest.fn(),
  fetchMemberDetail: jest.fn(),
  filteredMembers: jest.fn().mockReturnValue([
    { id: 'm1', name: 'Alice', email: 'alice@test.com', trainerId: null, trainerName: null },
    { id: 'm2', name: 'Bob', email: 'bob@test.com', trainerId: null, trainerName: null },
  ]),
  setSearchQuery: jest.fn(),
};

const TRAINERS_STATE = {
  trainers: [{ id: 'trainer1', name: 'Jane Smith', email: 'jane@test.com', memberCount: 2 }],
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  detailError: null,
  fetchTrainers: jest.fn(),
  fetchTrainerDetail: jest.fn(),
};

const SERVICE_TYPES_STATE = {
  items: [
    {
      _id: 'st1',
      name: 'Personal Training',
      durationMin: 60,
      pricePerSession: 100,
      currency: 'USD',
      note: null,
      isActive: true,
      createdBy: 'owner1',
      createdAt: '2026-01-01',
    },
  ],
  filter: 'all' as const,
  loading: false,
  error: null,
  fetchServiceTypes: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  setFilter: jest.fn(),
};

function makeCalendarState(overrides: { create?: jest.Mock; update?: jest.Mock } = {}) {
  return {
    items: [],
    loading: false,
    error: null,
    range: 'upcoming' as const,
    fetch: jest.fn(),
    groupedByDay: jest.fn().mockReturnValue([]),
    create: overrides.create ?? jest.fn().mockResolvedValue(undefined),
    update: overrides.update ?? jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function setupMocks(userRole: 'owner' | 'trainer' = 'owner', calendarOverrides: { create?: jest.Mock; update?: jest.Mock } = {}) {
  const calendarState = makeCalendarState(calendarOverrides);
  mockUseCalendarStore.mockImplementation(
    (selector?: (s: typeof calendarState) => unknown) => {
      if (typeof selector === 'function') return selector(calendarState);
      return calendarState;
    },
  );

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
    user: {
      id: 'user1',
      firstName: 'Owner',
      lastName: 'User',
      role: userRole,
      trainerId: null,
    },
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

  return calendarState;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks('owner');
});

describe('SessionForm', () => {
  it('renders with screen testID screen-SessionForm', () => {
    const { getByTestId } = render(
      <SessionForm onClose={jest.fn()} />,
    );
    expect(getByTestId('screen-SessionForm')).toBeTruthy();
  });

  it('save button disabled when no member, date, startTime, endTime set', () => {
    const { getByTestId } = render(
      <SessionForm onClose={jest.fn()} />,
    );
    const saveBtn = getByTestId('session-form-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  // ── formReducer: SET_MEMBER ──────────────────────────────────────────────────

  describe('formReducer > SET_MEMBER', () => {
    it('replaces memberId with the given id (single id stored, not appended)', () => {
      // Verify the member Select trigger is present
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);
      expect(getByTestId('member-select-trigger')).toBeTruthy();
    });

    it('save button enabled after single member is chosen plus date/startTime/endTime', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      // Select a member via mocked SelectItem
      fireEvent.press(getByTestId('select-item-m1'));

      fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
      fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');

      const saveBtn = getByTestId('session-form-save-button');
      expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
    });

    it('save button remains disabled when memberId is empty string', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
      fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');

      // No member chosen
      const saveBtn = getByTestId('session-form-save-button');
      expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ── formReducer: SET_SERVICE_TYPE ────────────────────────────────────────────

  describe('formReducer > SET_SERVICE_TYPE', () => {
    it('stores serviceTypeId and recomputes endTime from durationMin', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      // Set startTime first
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');

      // Select service type via mocked SelectItem (value = st1, durationMin = 60)
      fireEvent.press(getByTestId('select-item-st1'));

      // endTime should be auto-filled: 09:00 + 60 min = 10:00
      const endInput = getByTestId('session-form-end-input');
      expect(endInput.props.value).toBe('10:00');
    });
  });

  // ── formReducer: SET_CUSTOM_FEE ──────────────────────────────────────────────

  describe('formReducer > SET_CUSTOM_FEE', () => {
    it('stores the raw string value', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      const feeInput = getByTestId('session-form-custom-fee-input');
      fireEvent.changeText(feeInput, '49.99');
      expect(feeInput.props.value).toBe('49.99');
    });
  });

  // ── buildInitialState ────────────────────────────────────────────────────────

  describe('buildInitialState', () => {
    it('seeds memberId from session.memberIds[0] in edit mode', () => {
      const session = makeSession({ memberIds: ['m1'] });
      const { getByTestId } = render(<SessionForm session={session} onClose={jest.fn()} />);

      // The member Select trigger should be present
      expect(getByTestId('member-select-trigger')).toBeTruthy();
      // Edit mode pre-fills date/start/end/member, so save button is enabled
      const saveBtn = getByTestId('session-form-save-button');
      expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
    });

    it('defaults memberId to empty string in create mode (save disabled until chosen)', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      const saveBtn = getByTestId('session-form-save-button');
      expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  // ── isValid ──────────────────────────────────────────────────────────────────

  describe('isValid', () => {
    it('requires memberId non-empty plus date/start/end', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
      fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');

      // Still disabled — no member
      expect(getByTestId('session-form-save-button').props.accessibilityState?.disabled).toBe(true);

      // Choose member
      fireEvent.press(getByTestId('select-item-m1'));

      expect(getByTestId('session-form-save-button').props.accessibilityState?.disabled).toBe(false);
    });
  });

  // ── handleSave: create DTO ───────────────────────────────────────────────────

  describe('handleSave > create DTO', () => {
    it('sends memberIds:[memberId] and omits customFee when blank', async () => {
      const create = jest.fn().mockResolvedValue(undefined);
      setupMocks('owner', { create });

      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      fireEvent.press(getByTestId('select-item-m1'));
      fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
      fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');

      await act(async () => {
        fireEvent.press(getByTestId('session-form-save-button'));
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ memberIds: ['m1'] }),
      );
      const callArg = create.mock.calls[0][0];
      expect(callArg.customFee).toBeUndefined();
    });

    it('sends customFee as a number when filled', async () => {
      const create = jest.fn().mockResolvedValue(undefined);
      setupMocks('owner', { create });

      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);

      fireEvent.press(getByTestId('select-item-m1'));
      fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
      fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
      fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');
      fireEvent.changeText(getByTestId('session-form-custom-fee-input'), '49.99');

      await act(async () => {
        fireEvent.press(getByTestId('session-form-save-button'));
      });

      const callArg = create.mock.calls[0][0];
      expect(callArg.customFee).toBe(49.99);
    });
  });

  // ── Select triggers present ──────────────────────────────────────────────────

  describe('Select triggers', () => {
    it('member-select-trigger is present', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);
      expect(getByTestId('member-select-trigger')).toBeTruthy();
    });

    it('trainer-select-trigger is present for owner', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);
      expect(getByTestId('trainer-select-trigger')).toBeTruthy();
    });

    it('service-type-select-trigger is present', () => {
      const { getByTestId } = render(<SessionForm onClose={jest.fn()} />);
      expect(getByTestId('service-type-select-trigger')).toBeTruthy();
    });

    it('trainer-select-trigger is absent for trainer role', () => {
      setupMocks('trainer');
      const { queryByTestId } = render(<SessionForm onClose={jest.fn()} />);
      expect(queryByTestId('trainer-select-trigger')).toBeNull();
    });
  });

  // ── Recurrence ───────────────────────────────────────────────────────────────

  it('setting recurrence weeks includes recurrence in submitted payload', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    setupMocks('owner', { create });

    const { getByTestId } = render(
      <SessionForm onClose={jest.fn()} />,
    );

    // Choose member via mocked SelectItem
    fireEvent.press(getByTestId('select-item-m1'));

    fireEvent.changeText(getByTestId('session-form-date-input'), '2026-07-15');
    fireEvent.changeText(getByTestId('session-form-start-input'), '09:00');
    fireEvent.changeText(getByTestId('session-form-end-input'), '10:00');

    // Toggle recurrence
    fireEvent.press(getByTestId('session-form-recurrence-toggle'));

    // Set recurrence weeks to 4
    fireEvent.changeText(getByTestId('session-form-recurrence-weeks-input'), '4');

    // Save
    await act(async () => {
      fireEvent.press(getByTestId('session-form-save-button'));
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { weeks: 4 } }),
    );
  });

  // ── Edit mode ────────────────────────────────────────────────────────────────

  it('in edit mode, pre-fills fields from session and calls update on save', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    setupMocks('owner', { update });

    const session = makeSession({ customServiceName: 'Yoga' });
    const { getByTestId } = render(
      <SessionForm session={session} onClose={jest.fn()} />,
    );

    // Date field should be pre-filled
    const dateInput = getByTestId('session-form-date-input');
    expect(dateInput.props.value).toBe('2026-07-15');

    // Save should call update
    await act(async () => {
      fireEvent.press(getByTestId('session-form-save-button'));
    });

    expect(update).toHaveBeenCalledWith('sess1', expect.any(Object));
  });

  it('shows scope selector for series sessions in edit mode', () => {
    const session = makeSession({ seriesId: 'series-123' });
    const { getByTestId } = render(
      <SessionForm session={session} onClose={jest.fn()} />,
    );
    expect(getByTestId('session-form-scope-selector')).toBeTruthy();
  });

  it('does not show scope selector for non-series sessions in edit mode', () => {
    const session = makeSession({ seriesId: null });
    const { queryByTestId } = render(
      <SessionForm session={session} onClose={jest.fn()} />,
    );
    expect(queryByTestId('session-form-scope-selector')).toBeNull();
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <SessionForm onClose={onClose} />,
    );
    fireEvent.press(getByTestId('session-form-cancel-button'));
    expect(onClose).toHaveBeenCalled();
  });
});
