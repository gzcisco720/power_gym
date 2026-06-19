/**
 * Stage 3 unit tests — MembersScreen
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

// Mock Reusables Select (same pattern as invites spec)
jest.mock('~/components/ui/select', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const mockCtx = mockReact.createContext<{ value: { value: string; label: string } | undefined; onValueChange: ((opt: { value: string; label: string } | undefined) => void) | undefined }>({ value: undefined, onValueChange: undefined });

  const mockSelect = ({ value, onValueChange, children }: { value: { value: string; label: string } | undefined; onValueChange: ((opt: { value: string; label: string } | undefined) => void) | undefined; children: unknown }) =>
    mockReact.createElement(mockCtx.Provider, { value: { value, onValueChange } }, children);

  const mockSelectTrigger = ({ children, testID }: { children: unknown; testID?: string }) =>
    mockReact.createElement(mockRN.View, { testID }, children);

  const mockSelectValue = ({ placeholder }: { placeholder?: string }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(mockRN.Text, null, ctx.value?.label || placeholder || '');
  };

  const mockSelectContent = ({ children }: { children: unknown }) =>
    mockReact.createElement(mockRN.View, null, children);

  const mockSelectItem = ({ value: itemValue, label }: { value: string; label: string }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(
      mockRN.Pressable,
      {
        testID: 'select-item-' + itemValue,
        onPress: () => ctx.onValueChange && ctx.onValueChange({ value: itemValue, label }),
        accessibilityLabel: label,
      },
      mockReact.createElement(mockRN.Text, null, label),
    );
  };

  return {
    __esModule: true,
    Select: mockSelect,
    SelectTrigger: mockSelectTrigger,
    SelectValue: mockSelectValue,
    SelectContent: mockSelectContent,
    SelectItem: mockSelectItem,
  };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import { useMembersStore } from '../../stores/members.store';
import { useTrainersStore } from '../../stores/trainers.store';
import { Member } from '../../types/members';
import { TrainerListItem } from '../../types/trainers';
import { MembersScreen } from './MembersScreen';

const mockUseStore = useMembersStore as jest.MockedFunction<typeof useMembersStore>;
const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'mem1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    trainerId: 'trainer1',
    trainerName: 'Bob Trainer',
    ...overrides,
  };
}

function makeStoreState(members: Member[], overrides: Partial<{
  loading: boolean;
  searchQuery: string;
  setSearchQuery: jest.Mock;
  fetchMembers: jest.Mock;
  filteredMembers: jest.Mock;
  assignTrainer: jest.Mock;
  unassignTrainer: jest.Mock;
  trainerFilter: string | null;
  setTrainerFilter: jest.Mock;
}> = {}) {
  return {
    members,
    loading: false,
    error: null,
    searchQuery: '',
    selectedMembers: {},
    detailLoading: false,
    detailError: null,
    fetchMembers: jest.fn(),
    filteredMembers: jest.fn(() => members),
    setSearchQuery: jest.fn(),
    fetchMemberDetail: jest.fn(),
    assignTrainer: jest.fn(),
    unassignTrainer: jest.fn(),
    trainerFilter: null,
    setTrainerFilter: jest.fn(),
    ...overrides,
  };
}

function makeTrainersStoreState(trainers: TrainerListItem[]) {
  const state = {
    trainers,
    loading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    fetchTrainers: jest.fn(),
    fetchTrainerDetail: jest.fn(),
    removeTrainer: jest.fn(),
  };
  mockUseTrainersStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
  return state;
}

function setupStore(state: ReturnType<typeof makeStoreState>) {
  mockUseStore.mockImplementation(
    (selector?: (s: ReturnType<typeof makeStoreState>) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  makeTrainersStoreState([]);
});

describe('MembersScreen', () => {
  it('renders a MemberCard per member with initials, name, email, and trainer assignment', () => {
    const members = [
      makeMember({ id: 'mem1', name: 'Alice Smith', email: 'alice@example.com', trainerName: 'Bob Trainer' }),
      makeMember({ id: 'mem2', name: 'Charlie Jones', email: 'charlie@example.com', trainerName: null }),
    ];
    setupStore(makeStoreState(members, { filteredMembers: jest.fn(() => members) }));

    const { getByTestId, getByText } = render(<MembersScreen />);

    expect(getByTestId('member-card-mem1')).toBeTruthy();
    expect(getByTestId('member-card-mem2')).toBeTruthy();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByText('Bob Trainer')).toBeTruthy();
    expect(getByText('Charlie Jones')).toBeTruthy();
  });

  it('typing in the search input calls setSearchQuery', () => {
    const setSearchQuery = jest.fn();
    setupStore(makeStoreState([], { setSearchQuery }));

    const { getByTestId } = render(<MembersScreen />);
    fireEvent.changeText(getByTestId('members-search-input'), 'alice');

    expect(setSearchQuery).toHaveBeenCalledWith('alice');
  });

  it('tapping a MemberCard navigates to MemberDetail with the member id', () => {
    const member = makeMember({ id: 'mem1' });
    setupStore(makeStoreState([member], { filteredMembers: jest.fn(() => [member]) }));

    const { getByTestId } = render(<MembersScreen />);
    fireEvent.press(getByTestId('member-card-mem1'));

    expect(mockNavigate).toHaveBeenCalledWith('MemberDetail', { memberId: 'mem1' });
  });

  // ── Stage 1 Sprint Contract: trainer filter Select ───────────────────────

  describe('trainer filter', () => {
    it('renders a Select (no picker Modal) with an "All trainers" placeholder and one item per trainer', () => {
      const trainer: TrainerListItem = { id: 'tr1', name: 'Bob Trainer', email: 'bob@example.com', memberCount: 2 };
      makeTrainersStoreState([trainer]);
      setupStore(makeStoreState([], { filteredMembers: jest.fn(() => []) }));

      const { getByTestId, getAllByText, getByText, queryByTestId } = render(<MembersScreen />);

      // Select trigger must be present with testID
      expect(getByTestId('trainer-filter-select')).toBeTruthy();
      // Shows the placeholder and the "All trainers" SelectItem (both rendered by mock)
      expect(getAllByText('All trainers').length).toBeGreaterThanOrEqual(1);
      // One item per trainer (rendered by Select mock)
      expect(getByText('Bob Trainer')).toBeTruthy();
      // Old Modal chip nodes must be absent
      expect(queryByTestId('trainer-filter-chip-all')).toBeNull();
      expect(queryByTestId('trainer-filter-chip-tr1')).toBeNull();
    });

    it('choosing a trainer calls setTrainerFilter with that id; choosing All calls setTrainerFilter(null)', () => {
      const trainer: TrainerListItem = { id: 'tr1', name: 'Bob Trainer', email: 'bob@example.com', memberCount: 2 };
      makeTrainersStoreState([trainer]);

      const setTrainerFilter = jest.fn();
      setupStore(makeStoreState([], {
        trainerFilter: null,
        setTrainerFilter,
        filteredMembers: jest.fn(() => []),
      }));

      const { getByTestId } = render(<MembersScreen />);

      // Select a specific trainer
      fireEvent.press(getByTestId('select-item-tr1'));
      expect(setTrainerFilter).toHaveBeenCalledWith('tr1');

      // Select undefined (All trainers) — the select-item-undefined placeholder
      fireEvent.press(getByTestId('select-item-'));
      expect(setTrainerFilter).toHaveBeenCalledWith(null);
    });
  });

  it('stats strip shows total member count and unassigned count', () => {
    const members = [
      makeMember({ id: 'mem1', trainerId: 'tr1' }),
      makeMember({ id: 'mem2', trainerId: null }),
      makeMember({ id: 'mem3', trainerId: null }),
    ];
    setupStore(makeStoreState(members, { filteredMembers: jest.fn(() => members) }));

    const { getByTestId } = render(<MembersScreen />);
    expect(getByTestId('stats-total-members').props.children).toBe('3');
    expect(getByTestId('stats-unassigned').props.children).toBe('2');
  });

  it('toast-message is not rendered when no action has occurred', () => {
    const member = makeMember({ id: 'mem1' });
    setupStore(makeStoreState([member], { filteredMembers: jest.fn(() => [member]) }));

    const { queryByTestId } = render(<MembersScreen />);

    expect(queryByTestId('toast-message')).toBeNull();
  });

  it('reassign: toast-message shows "Trainer assigned" after picking a trainer in the sheet', async () => {
    const assignTrainer = jest.fn().mockResolvedValue(undefined);
    const trainer: TrainerListItem = { id: 'tr1', name: 'Bob Trainer', email: 'bob@example.com', memberCount: 2 };
    makeTrainersStoreState([trainer]);

    const member = makeMember({ id: 'mem1', trainerId: 'tr1', trainerName: 'Bob Trainer' });
    setupStore(makeStoreState([member], { assignTrainer, filteredMembers: jest.fn(() => [member]) }));

    const { getAllByTestId, getByTestId, queryByTestId } = render(<MembersScreen />);

    expect(queryByTestId('toast-message')).toBeNull();

    // Open reassign sheet
    fireEvent.press(getByTestId('reassign-btn-mem1'));

    // The trainer appears in both the filter Select and the reassign sheet Select.
    // Use the second occurrence (reassign sheet) to trigger the selection.
    await act(async () => {
      const trainerItems = getAllByTestId('select-item-tr1');
      fireEvent.press(trainerItems[trainerItems.length - 1]);
    });

    expect(getByTestId('toast-message').props.children).toBe('Trainer assigned');
    expect(assignTrainer).toHaveBeenCalledWith('mem1', 'tr1');
  });

  it('unassign action: Unassign button is shown only when the member has a trainer assigned', () => {
    const memberWithTrainer = makeMember({ id: 'mem1', trainerId: 'tr1', trainerName: 'Bob Trainer' });
    const memberNoTrainer = makeMember({ id: 'mem2', trainerId: null, trainerName: null });
    const allMembers = [memberWithTrainer, memberNoTrainer];
    setupStore(makeStoreState(allMembers, { filteredMembers: jest.fn(() => allMembers) }));

    const { queryByTestId } = render(<MembersScreen />);

    expect(queryByTestId('unassign-btn-mem1')).toBeTruthy();
    expect(queryByTestId('unassign-btn-mem2')).toBeNull();
  });
});
