/**
 * Stage 3 unit tests — MembersScreen
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

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

  it('trainer filter: tapping a trainer chip filters the list to that trainer members client-side', () => {
    const trainer: TrainerListItem = { id: 'tr1', name: 'Bob Trainer', email: 'bob@example.com', memberCount: 2 };
    makeTrainersStoreState([trainer]);

    const setTrainerFilter = jest.fn();
    const allMembers = [
      makeMember({ id: 'mem1', trainerId: 'tr1', trainerName: 'Bob Trainer' }),
      makeMember({ id: 'mem2', trainerId: null, trainerName: null }),
    ];
    setupStore(makeStoreState(allMembers, {
      trainerFilter: null,
      setTrainerFilter,
      filteredMembers: jest.fn(() => allMembers),
    }));

    const { getByTestId } = render(<MembersScreen />);
    fireEvent.press(getByTestId('trainer-filter-chip-tr1'));

    expect(setTrainerFilter).toHaveBeenCalledWith('tr1');
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
