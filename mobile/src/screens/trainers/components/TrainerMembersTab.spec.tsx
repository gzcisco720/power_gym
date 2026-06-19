import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

// Mock Reusables Select
jest.mock('~/components/ui/select', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const mockCtx = mockReact.createContext<{
    value: { value: string; label: string } | undefined;
    onValueChange: ((opt: { value: string; label: string } | undefined) => void) | undefined;
  }>({ value: undefined, onValueChange: undefined });

  const mockSelect = ({
    value,
    onValueChange,
    children,
  }: {
    value: { value: string; label: string } | undefined;
    onValueChange: ((opt: { value: string; label: string } | undefined) => void) | undefined;
    children: unknown;
  }) => mockReact.createElement(mockCtx.Provider, { value: { value, onValueChange } }, children);

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

  // ── Stage 1 Sprint Contract: reassign sheet uses Select ──────────────────

  describe('reassign sheet', () => {
    it('renders a Select of otherTrainers and triggers reassign on change', async () => {
      const reassignMember = jest.fn().mockResolvedValue(undefined);
      const otherTrainer = { id: 'tr2', name: 'Carol Trainer', email: 'carol@example.com', memberCount: 0 };
      setupStoreMock({
        trainerMembers: MOCK_MEMBERS,
        reassignMember,
        trainers: [
          { id: 'tr1', name: 'Current Trainer', email: 'current@example.com', memberCount: 2 },
          otherTrainer,
        ],
        fetchTrainers: jest.fn().mockResolvedValue(undefined),
      });

      const { getByTestId, getByText } = render(<TrainerMembersTab trainerId="tr1" />);

      // Open the reassign sheet for first member
      fireEvent.press(getByTestId('reassign-member-m1'));

      // Select trigger for the trainer picker
      expect(getByTestId('reassign-target-select-trigger')).toBeTruthy();

      // The other trainer should be listed
      expect(getByText('Carol Trainer')).toBeTruthy();

      // Selecting a trainer calls reassignMember with (currentTrainerId, memberId, targetTrainerId)
      fireEvent.press(getByTestId('select-item-tr2'));
      expect(reassignMember).toHaveBeenCalledWith('tr1', 'm1', 'tr2');
    });
  });
});
