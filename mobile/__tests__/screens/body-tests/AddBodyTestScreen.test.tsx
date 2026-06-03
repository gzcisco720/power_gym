import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../src/stores/body-tests.store', () => ({
  useBodyTestsStore: jest.fn(),
}));

jest.mock('../../../src/lib/api/body-tests.api', () => ({
  createBodyTest: jest.fn(),
}));

import { useBodyTestsStore } from '../../../src/stores/body-tests.store';
import { AddBodyTestScreen } from '../../../src/screens/body-test-shared/AddBodyTestScreen';

const mockUseBodyTestsStore = useBodyTestsStore as jest.MockedFunction<typeof useBodyTestsStore>;

function makeStoreState(overrides: Partial<ReturnType<typeof useBodyTestsStore>> = {}) {
  const state = {
    items: [],
    loading: false,
    error: null,
    fetchMyBodyTests: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  };
  // Support selector-based calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockUseBodyTestsStore as jest.Mock).mockImplementation((selector?: (s: typeof state) => any) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  makeStoreState();
});

describe('AddBodyTestScreen', () => {
  it('selecting 3-Site + male shows chest/abdominal/thigh fields', () => {
    const { getByTestId, queryByTestId } = render(<AddBodyTestScreen />);
    // 3-Site is selected by default (or select it)
    fireEvent.press(getByTestId('protocol-3site'));
    fireEvent.press(getByTestId('sex-male'));
    expect(getByTestId('measurement-chest')).toBeTruthy();
    expect(getByTestId('measurement-abdominal')).toBeTruthy();
    expect(getByTestId('measurement-thigh')).toBeTruthy();
    expect(queryByTestId('measurement-tricep')).toBeNull();
    expect(queryByTestId('measurement-suprailiac')).toBeNull();
  });

  it('selecting 3-Site + female shows tricep/suprailiac/thigh fields', () => {
    const { getByTestId, queryByTestId } = render(<AddBodyTestScreen />);
    fireEvent.press(getByTestId('protocol-3site'));
    fireEvent.press(getByTestId('sex-female'));
    expect(getByTestId('measurement-tricep')).toBeTruthy();
    expect(getByTestId('measurement-suprailiac')).toBeTruthy();
    expect(getByTestId('measurement-thigh')).toBeTruthy();
    expect(queryByTestId('measurement-chest')).toBeNull();
    expect(queryByTestId('measurement-abdominal')).toBeNull();
  });

  it('LivePreview shows "—" until required inputs complete, then shows a calculated percentage', () => {
    const { getByTestId, getByText, queryByText } = render(<AddBodyTestScreen />);
    // Initially shows dash (incomplete)
    expect(getByTestId('bodytest-preview-bodyfat')).toBeTruthy();
    expect(queryByText('—')).toBeTruthy();

    // Fill required basic info
    fireEvent.press(getByTestId('protocol-3site'));
    fireEvent.press(getByTestId('sex-male'));
    fireEvent.changeText(getByTestId('body-test-age-input'), '30');
    fireEvent.changeText(getByTestId('body-test-weight-input'), '77');
    fireEvent.changeText(getByTestId('measurement-chest'), '12');
    fireEvent.changeText(getByTestId('measurement-abdominal'), '18');
    fireEvent.changeText(getByTestId('measurement-thigh'), '20');

    // Should now show a percentage (not "—")
    const previewEl = getByTestId('bodytest-preview-bodyfat');
    expect(previewEl.props.children).not.toBe('—');
  });

  it('Save button is disabled until all required fields are filled and enabled once valid', () => {
    const { getByTestId } = render(<AddBodyTestScreen />);
    const saveButton = getByTestId('bodytest-save-button');

    // Initially disabled
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);

    // Fill all required fields for 3site male
    fireEvent.press(getByTestId('protocol-3site'));
    fireEvent.press(getByTestId('sex-male'));
    fireEvent.changeText(getByTestId('body-test-age-input'), '30');
    fireEvent.changeText(getByTestId('body-test-weight-input'), '77');
    fireEvent.changeText(getByTestId('measurement-chest'), '12');
    fireEvent.changeText(getByTestId('measurement-abdominal'), '18');
    fireEvent.changeText(getByTestId('measurement-thigh'), '20');

    expect(getByTestId('bodytest-save-button').props.accessibilityState?.disabled).toBe(false);
  });
});
