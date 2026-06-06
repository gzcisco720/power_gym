import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../src/stores/body-tests.store', () => ({
  useBodyTestsStore: jest.fn(),
}));

jest.mock('../../../src/stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

import { useBodyTestsStore } from '../../../src/stores/body-tests.store';
import { useAuthStore } from '../../../src/stores/auth.store';
import { BodyTest } from '../../../src/types/body-tests';
import { MyBodyTestsScreen } from '../../../src/screens/my-body-tests/MyBodyTestsScreen';

const mockUseBodyTestsStore = useBodyTestsStore as jest.MockedFunction<typeof useBodyTestsStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

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

function makeStoreState(overrides: Partial<ReturnType<typeof useBodyTestsStore>> = {}) {
  return {
    items: [],
    loading: false,
    error: null,
    fetchMyBodyTests: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  };
}

function makeUser(role: 'owner' | 'trainer' | 'member') {
  return { id: 'u1', firstName: 'Test', lastName: 'User', role, trainerId: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: owner role
  mockUseAuthStore.mockReturnValue(makeUser('owner') as ReturnType<typeof useAuthStore>);
});

describe('MyBodyTestsScreen', () => {
  it('renders a card per store item', () => {
    const test = makeBodyTest({ _id: 'bt-1' });
    mockUseBodyTestsStore.mockReturnValue(makeStoreState({ items: [test] }));
    const { getByTestId } = render(<MyBodyTestsScreen />);
    expect(getByTestId('body-test-card-bt-1')).toBeTruthy();
  });

  it('shows empty copy "No body tests recorded yet." when items is empty', () => {
    mockUseBodyTestsStore.mockReturnValue(makeStoreState({ items: [] }));
    const { getByText } = render(<MyBodyTestsScreen />);
    expect(getByText('No body tests recorded yet.')).toBeTruthy();
  });

  it('tapping the "+" button navigates to AddBodyTest', () => {
    mockUseBodyTestsStore.mockReturnValue(makeStoreState());
    const { getByTestId } = render(<MyBodyTestsScreen />);
    fireEvent.press(getByTestId('bodytests-add-button'));
    expect(mockNavigate).toHaveBeenCalledWith('AddBodyTest');
  });

  it('does not render the add button when the user role is member', () => {
    mockUseAuthStore.mockReturnValue(makeUser('member') as ReturnType<typeof useAuthStore>);
    mockUseBodyTestsStore.mockReturnValue(makeStoreState());
    const { queryByTestId } = render(<MyBodyTestsScreen />);
    expect(queryByTestId('bodytests-add-button')).toBeNull();
  });

  it('renders the add button when the user role is owner', () => {
    mockUseAuthStore.mockReturnValue(makeUser('owner') as ReturnType<typeof useAuthStore>);
    mockUseBodyTestsStore.mockReturnValue(makeStoreState());
    const { getByTestId } = render(<MyBodyTestsScreen />);
    expect(getByTestId('bodytests-add-button')).toBeTruthy();
  });
});
