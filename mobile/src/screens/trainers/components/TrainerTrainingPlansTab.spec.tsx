import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../stores/trainers.store', () => ({
  useTrainersStore: jest.fn(),
}));

import { useTrainersStore } from '../../../stores/trainers.store';
import { TrainerTrainingPlansTab } from './TrainerTrainingPlansTab';
import { TrainerTemplateItem } from '../../../types/trainers';

const mockUseTrainersStore = useTrainersStore as jest.MockedFunction<typeof useTrainersStore>;

function setupStoreMock(overrides: Record<string, unknown> = {}) {
  const state = {
    trainerTrainingPlans: [],
    trainerTrainingPlansLoading: false,
    trainerTrainingPlansError: null,
    fetchTrainerTrainingPlans: jest.fn(),
    ...overrides,
  };
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

const MOCK_PLANS: TrainerTemplateItem[] = [
  { id: 'tp1', name: 'Strength Plan', dayCount: 4, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'tp2', name: 'Hypertrophy Block', dayCount: 5, createdAt: '2026-02-01T00:00:00.000Z' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TrainerTrainingPlansTab', () => {
  it('renders an empty state when the trainer has no templates', () => {
    setupStoreMock({ trainerTrainingPlans: [] });

    const { getByText } = render(<TrainerTrainingPlansTab trainerId="tr1" />);

    expect(getByText('No training plans yet.')).toBeTruthy();
  });

  it('renders plan name and dayCount rows for each template', () => {
    setupStoreMock({ trainerTrainingPlans: MOCK_PLANS });

    const { getByText } = render(<TrainerTrainingPlansTab trainerId="tr1" />);

    expect(getByText('Strength Plan')).toBeTruthy();
    expect(getByText('Hypertrophy Block')).toBeTruthy();
    expect(getByText('4 days')).toBeTruthy();
    expect(getByText('5 days')).toBeTruthy();
  });

  it('calls fetchTrainerTrainingPlans on mount', () => {
    const fetchTrainerTrainingPlans = jest.fn().mockResolvedValue(undefined);
    setupStoreMock({ fetchTrainerTrainingPlans });

    render(<TrainerTrainingPlansTab trainerId="tr1" />);

    expect(fetchTrainerTrainingPlans).toHaveBeenCalledWith('tr1');
  });
});
