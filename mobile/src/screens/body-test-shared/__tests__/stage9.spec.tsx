/**
 * Stage 9 unit tests — members top-level + body-test-shared
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ── Shared mocks ──────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: jest.fn(),
}));

// ── MembersScreen mocks ───────────────────────────────────────────────────────

jest.mock('../../../stores/members.store', () => ({
  useMembersStore: jest.fn(),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

// ── AddBodyTestScreen mocks ───────────────────────────────────────────────────

const mockCreateBodyTest = jest.fn();
jest.mock('../../../lib/api/body-tests.api', () => ({
  createBodyTest: (...args: Parameters<typeof mockCreateBodyTest>) => mockCreateBodyTest(...args),
  deleteBodyTest: jest.fn(),
}));

jest.mock('../../../stores/body-tests.store', () => ({
  useBodyTestsStore: jest.fn(),
}));

// ── BodyTestDetailScreen mocks ────────────────────────────────────────────────

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useMembersStore } from '../../../stores/members.store';
import { useTrainersStore } from '../../../stores/trainers.store';
import { useBodyTestsStore } from '../../../stores/body-tests.store';
import { useAuthStore } from '../../../stores/auth.store';
import { useRoute } from '@react-navigation/native';
import { Member } from '../../../types/members';
import { MembersScreen } from '../../members/MembersScreen';
import { AddBodyTestScreen } from '../AddBodyTestScreen';
import { BodyTestDetailScreen } from '../BodyTestDetailScreen';

const mockUseMembersStore = useMembersStore as jest.MockedFunction<typeof useMembersStore>;
const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;
const mockUseBodyTestsStore = useBodyTestsStore as jest.MockedFunction<typeof useBodyTestsStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function setupMembersStore(members: Member[], overrides: Record<string, unknown> = {}) {
  const state = {
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
  mockUseMembersStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
  return state;
}

function setupTrainersStore() {
  const state = {
    trainers: [],
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
}

function setupBodyTestsStore(overrides: Record<string, unknown> = {}) {
  const state = {
    items: [],
    loading: false,
    error: null,
    fetchMyBodyTests: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  };
  mockUseBodyTestsStore.mockImplementation(
    (selector?: (s: typeof state) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
  return state;
}

const sampleBodyTest = {
  _id: 'bt1',
  date: '2026-06-01T00:00:00.000Z',
  protocol: '3site' as const,
  sex: 'male' as const,
  age: 30,
  weight: 80,
  bodyFatPct: 15.0,
  fatMassKg: 12.0,
  leanMassKg: 68.0,
  tricep: null,
  chest: 10,
  subscapular: null,
  abdominal: 12,
  suprailiac: null,
  thigh: 14,
  midaxillary: null,
  bicep: null,
  lumbar: null,
  bodyFatPctManual: null,
  targetWeight: null,
  targetBodyFatPct: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  setupTrainersStore();
  mockCreateBodyTest.mockResolvedValue({ ...sampleBodyTest, _id: 'bt-new' });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MembersScreen', () => {
  describe('search', () => {
    it('filters member list — typing in Reusables Input calls setSearchQuery', () => {
      const setSearchQuery = jest.fn();
      const members = [makeMember()];
      setupMembersStore(members, { setSearchQuery });

      const { getByTestId } = render(<MembersScreen />);
      fireEvent.changeText(getByTestId('members-search-input'), 'alice');

      expect(setSearchQuery).toHaveBeenCalledWith('alice');
    });
  });

  describe('loading', () => {
    it('renders Skeleton rows when loading is true', () => {
      setupMembersStore([], { loading: true, filteredMembers: jest.fn(() => []) });

      const { getAllByTestId } = render(<MembersScreen />);
      // Skeleton rows should be present
      const skeletons = getAllByTestId('skeleton-row');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('AddBodyTestScreen', () => {
  describe('submit', () => {
    it('calls create with skinfold values when form is filled', async () => {
      const addItem = jest.fn();
      setupBodyTestsStore({ addItem });

      const { getByTestId } = render(<AddBodyTestScreen />);

      // Fill age
      fireEvent.changeText(getByTestId('body-test-age-input'), '30');
      // Select sex: male
      fireEvent.press(getByTestId('sex-male'));
      // Fill weight
      fireEvent.changeText(getByTestId('body-test-weight-input'), '80');
      // Protocol defaults to 3site, male: chest, abdominal, thigh
      fireEvent.changeText(getByTestId('measurement-chest'), '10');
      fireEvent.changeText(getByTestId('measurement-abdominal'), '12');
      fireEvent.changeText(getByTestId('measurement-thigh'), '14');

      // Save
      await act(async () => {
        fireEvent.press(getByTestId('bodytest-save-button'));
      });

      expect(mockCreateBodyTest).toHaveBeenCalledWith(
        expect.objectContaining({
          age: 30,
          sex: 'male',
          weight: 80,
          chest: 10,
          abdominal: 12,
          thigh: 14,
        }),
      );
    });
  });
});

describe('BodyTestDetailScreen', () => {
  describe('delete', () => {
    it('opens Reusables Dialog and confirms', async () => {
      const removeItem = jest.fn();
      setupBodyTestsStore({ removeItem });
      mockUseAuthStore.mockImplementation(
        (selector?: (s: { user: { role: string } }) => unknown) => {
          const state = { user: { role: 'owner' } };
          if (typeof selector === 'function') return selector(state);
          return state;
        },
      );
      mockUseRoute.mockReturnValue({
        params: { bodyTest: sampleBodyTest },
        key: 'BodyTestDetail',
        name: 'BodyTestDetail',
      });

      const { getByTestId } = render(<BodyTestDetailScreen />);

      // Open delete dialog
      fireEvent.press(getByTestId('bodytest-delete-button'));

      // Dialog confirm button appears
      expect(getByTestId('bodytest-delete-confirm')).toBeTruthy();

      // Mock the deleteBodyTest API
      const { deleteBodyTest } = jest.requireMock('../../../lib/api/body-tests.api') as { deleteBodyTest: jest.Mock };
      deleteBodyTest.mockResolvedValue(undefined);

      // Confirm delete
      await act(async () => {
        fireEvent.press(getByTestId('bodytest-delete-confirm'));
      });

      expect(removeItem).toHaveBeenCalledWith('bt1');
    });
  });
});
