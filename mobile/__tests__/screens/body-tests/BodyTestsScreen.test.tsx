import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../src/stores/body-tests.store', () => ({
  useBodyTestsStore: jest.fn(),
}));

import { useBodyTestsStore } from '../../../src/stores/body-tests.store';
import { BodyTestsScreen } from '../../../src/screens/body-tests/BodyTestsScreen';

const mockUseBodyTestsStore = useBodyTestsStore as jest.MockedFunction<typeof useBodyTestsStore>;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BodyTestsScreen', () => {
  it('does NOT render an add ("+") button (Member cannot create)', () => {
    mockUseBodyTestsStore.mockReturnValue(makeStoreState());
    const { queryByTestId } = render(<BodyTestsScreen />);
    expect(queryByTestId('bodytests-add-button')).toBeNull();
  });
});
