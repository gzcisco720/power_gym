import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

import { useTrainersStore } from '../../../stores/trainers.store';
import { TrainerMembersTab } from './TrainerMembersTab';
import { TrainerMemberMetrics } from '../../../types/trainers';

const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    trainerMembers: [],
    trainerMembersLoading: false,
    trainerMembersError: null,
    fetchTrainerMembers: jest.fn(),
    reassignMember: jest.fn(),
    trainers: [],
    fetchTrainers: jest.fn(),
    ...overrides,
  };
}

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const state = makeStoreState(overrides);
  mockUseTrainersStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useTrainersStore>) => unknown) => {
      if (typeof selector === 'function') {
        return selector(state as ReturnType<typeof useTrainersStore>);
      }
      return state;
    },
  );
  return state;
}

const MOCK_MEMBERS: TrainerMemberMetrics[] = [
  {
    id: 'm1',
    name: 'Bob Jones',
    email: 'bob@example.com',
    streak: 5,
    sessionsThisMonth: 12,
    status: 'active',
  },
  {
    id: 'm2',
    name: 'Carol White',
    email: 'carol@example.com',
    streak: 0,
    sessionsThisMonth: 3,
    status: 'needs-attn',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrainerMembersTab', () => {
  it('renders each member streak, sessionsThisMonth, and a status badge', () => {
    setupStoreMock({ trainerMembers: MOCK_MEMBERS });

    const { getByText } = render(
      <TrainerMembersTab trainerId="tr1" />,
    );

    // Member names
    expect(getByText('Bob Jones')).toBeTruthy();
    expect(getByText('Carol White')).toBeTruthy();

    // Streak values
    expect(getByText('5')).toBeTruthy(); // Bob's streak
    expect(getByText('0')).toBeTruthy(); // Carol's streak

    // Status badges
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('Needs Attn')).toBeTruthy();
  });

  it('shows empty state when trainerMembers is empty', () => {
    setupStoreMock({ trainerMembers: [] });

    const { getByText } = render(
      <TrainerMembersTab trainerId="tr1" />,
    );

    expect(getByText('No members assigned.')).toBeTruthy();
  });

  it('calls fetchTrainerMembers on mount', () => {
    const fetchTrainerMembers = jest.fn().mockResolvedValue(undefined);
    setupStoreMock({ trainerMembers: [], fetchTrainerMembers });

    render(<TrainerMembersTab trainerId="tr1" />);

    expect(fetchTrainerMembers).toHaveBeenCalledWith('tr1');
  });
});
