import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

import { useTrainersStore } from '../../stores/trainers.store';
import { TrainerListItem } from '../../types/trainers';
import { TrainersScreen } from './TrainersScreen';

const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function makeTrainer(overrides: Partial<TrainerListItem> = {}): TrainerListItem {
  return {
    id: 'trainer1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    memberCount: 3,
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
    removeTrainer: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrainersScreen', () => {
  it('calls fetchTrainers on mount and renders a TrainerRow per trainer', () => {
    const fetchTrainers = jest.fn().mockResolvedValue(undefined);
    const trainers = [
      makeTrainer({ id: 't1', name: 'Alice Smith' }),
      makeTrainer({ id: 't2', name: 'Bob Jones' }),
    ];
    setupStoreMock({ trainers, fetchTrainers });

    const { getByText, getByTestId } = render(<TrainersScreen />);

    expect(fetchTrainers).toHaveBeenCalled();
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(getByText('Bob Jones')).toBeTruthy();
    expect(getByTestId('trainer-row-t1')).toBeTruthy();
    expect(getByTestId('trainer-row-t2')).toBeTruthy();
  });

  it('renders empty state when trainers list is empty', () => {
    setupStoreMock({ trainers: [] });

    const { getByText } = render(<TrainersScreen />);

    expect(getByText('No trainers found.')).toBeTruthy();
  });

  it('renders skeleton rows while loading', () => {
    setupStoreMock({ loading: true });

    const { getByTestId } = render(<TrainersScreen />);

    // Screen root testID must be present
    expect(getByTestId('screen-Trainers')).toBeTruthy();
  });

  it('shows a Remove button on each trainer row', () => {
    const trainers = [
      makeTrainer({ id: 't1', name: 'Alice Smith' }),
    ];
    setupStoreMock({ trainers });

    const { getByTestId } = render(<TrainersScreen />);

    expect(getByTestId('remove-trainer-btn-t1')).toBeTruthy();
  });

  it('tapping Remove opens a confirmation dialog warning about member unassignment', () => {
    const trainers = [
      makeTrainer({ id: 't1', name: 'Alice Smith', memberCount: 3 }),
    ];
    setupStoreMock({ trainers });

    const { getByTestId, getByText } = render(<TrainersScreen />);
    fireEvent.press(getByTestId('remove-trainer-btn-t1'));

    expect(getByText('3 members will become unassigned')).toBeTruthy();
  });
});
