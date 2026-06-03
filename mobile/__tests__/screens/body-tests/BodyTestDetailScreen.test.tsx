import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { bodyTest: mockBodyTest } }),
}));

jest.mock('../../../src/stores/body-tests.store', () => ({
  useBodyTestsStore: jest.fn(),
}));

jest.mock('../../../src/stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../../src/lib/api/body-tests.api', () => ({
  deleteBodyTest: jest.fn(),
}));

import { useBodyTestsStore } from '../../../src/stores/body-tests.store';
import { useAuthStore } from '../../../src/stores/auth.store';
import { BodyTest } from '../../../src/types/body-tests';
import { BodyTestDetailScreen } from '../../../src/screens/body-test-shared/BodyTestDetailScreen';

const mockUseBodyTestsStore = useBodyTestsStore as jest.MockedFunction<typeof useBodyTestsStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

let mockBodyTest: BodyTest;

function makeBodyTest(overrides: Partial<BodyTest> = {}): BodyTest {
  return {
    _id: 'bt-1',
    memberId: 'member-1',
    trainerId: null,
    date: '2026-06-02T00:00:00.000Z',
    age: 30,
    sex: 'male',
    weight: 77,
    protocol: '3site',
    tricep: null,
    chest: 12,
    subscapular: null,
    abdominal: 18,
    suprailiac: null,
    thigh: 20,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 16.2,
    leanMassKg: 64.5,
    fatMassKg: 12.5,
    targetWeight: null,
    targetBodyFatPct: null,
    createdAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  };
}

function makeBodyTestsStoreState(overrides: Partial<ReturnType<typeof useBodyTestsStore>> = {}) {
  const state = {
    items: [],
    loading: false,
    error: null,
    fetchMyBodyTests: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockUseBodyTestsStore as jest.Mock).mockImplementation((selector?: (s: typeof state) => any) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBodyTest = makeBodyTest();
});

describe('BodyTestDetailScreen', () => {
  it('shows the Delete button for an owner', () => {
    makeBodyTestsStoreState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockUseAuthStore as jest.Mock).mockImplementation((selector?: (s: any) => any) => {
      const user = { role: 'owner' };
      if (typeof selector === 'function') return selector({ user });
      return { user };
    });

    const { getByTestId } = render(<BodyTestDetailScreen />);
    expect(getByTestId('bodytest-delete-button')).toBeTruthy();
  });

  it('hides the Delete button for a member', () => {
    makeBodyTestsStoreState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockUseAuthStore as jest.Mock).mockImplementation((selector?: (s: any) => any) => {
      const user = { role: 'member' };
      if (typeof selector === 'function') return selector({ user });
      return { user };
    });

    const { queryByTestId } = render(<BodyTestDetailScreen />);
    expect(queryByTestId('bodytest-delete-button')).toBeNull();
  });
});
