import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: jest.fn(),
}));

jest.mock('../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

import { useRoute } from '@react-navigation/native';
import { useTrainersStore } from '../../stores/trainers.store';
import { TrainerDetail } from '../../types/trainers';
import { TrainerDetailScreen } from './TrainerDetailScreen';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function makeDetail(overrides: Partial<TrainerDetail> = {}): TrainerDetail {
  return {
    id: 'trainer1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    memberCount: 2,
    joinDate: '2023-06-15T00:00:00.000Z',
    members: [
      { id: 'member1', name: 'John Doe', email: 'john@example.com' },
      { id: 'member2', name: 'Jane Doe', email: 'jane@example.com' },
    ],
    ...overrides,
  };
}

function makeStoreState(overrides: Partial<ReturnType<typeof useTrainersStore>> = {}) {
  return {
    trainers: [],
    loading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    fetchTrainers: jest.fn(),
    fetchTrainerDetail: jest.fn(),
    ...overrides,
  };
}

function setupStoreMock(overrides: Partial<ReturnType<typeof useTrainersStore>> = {}) {
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

function setupRoute(trainerId: string, trainerName: string) {
  mockUseRoute.mockReturnValue({
    key: 'TrainerDetail',
    name: 'TrainerDetail',
    params: { trainerId, trainerName },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoBack.mockReset();
});

describe('TrainerDetailScreen', () => {
  it('calls fetchTrainerDetail with route trainerId on mount', () => {
    const fetchTrainerDetail = jest.fn().mockResolvedValue(undefined);
    setupRoute('trainer1', 'Alice Smith');
    setupStoreMock({ fetchTrainerDetail });

    render(<TrainerDetailScreen />);

    expect(fetchTrainerDetail).toHaveBeenCalledWith('trainer1');
  });

  it('Overview tab shows memberCount and formatted joinDate', () => {
    setupRoute('trainer1', 'Alice Smith');
    const detail = makeDetail({
      memberCount: 2,
      joinDate: '2023-06-15T00:00:00.000Z',
    });
    setupStoreMock({ detail });

    const { getByText } = render(<TrainerDetailScreen />);

    // memberCount
    expect(getByText('2')).toBeTruthy();
    // joinDate formatted — should show the month and year at minimum
    expect(getByText(/Jun.*2023|2023.*Jun/)).toBeTruthy();
  });

  it('tapping Members tab renders a MemberRow per detail member', () => {
    setupRoute('trainer1', 'Alice Smith');
    const detail = makeDetail();
    setupStoreMock({ detail });

    const { getByTestId, getByText } = render(<TrainerDetailScreen />);

    // Tap Members tab
    fireEvent.press(getByTestId('trainer-detail-tab-members'));

    // Should show each member
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Jane Doe')).toBeTruthy();
  });

  it('renders trainer name in header', () => {
    setupRoute('trainer1', 'Alice Smith');
    setupStoreMock();

    const { getByText } = render(<TrainerDetailScreen />);

    expect(getByText('Alice Smith')).toBeTruthy();
  });
});
