/**
 * Stage 1 unit tests — ReassignTrainerSheet
 * Sprint Contract: renders a Select with one item per trainer and calls onSelect(id) on change
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

import { ReassignTrainerSheet } from './ReassignTrainerSheet';
import { TrainerListItem } from '../../../types/trainers';

const TRAINERS: TrainerListItem[] = [
  { id: 'tr1', name: 'Alice Trainer', email: 'alice@example.com', memberCount: 3 },
  { id: 'tr2', name: 'Bob Trainer', email: 'bob@example.com', memberCount: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReassignTrainerSheet', () => {
  it('renders a Select with one item per trainer and calls onSelect(id) on change', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, getByText } = render(
      <ReassignTrainerSheet trainers={TRAINERS} onSelect={onSelect} onClose={onClose} />,
    );

    // Select trigger must be present
    expect(getByTestId('reassign-trainer-select-trigger')).toBeTruthy();

    // One item per trainer
    expect(getByText('Alice Trainer')).toBeTruthy();
    expect(getByText('Bob Trainer')).toBeTruthy();

    // Selecting a trainer calls onSelect with the trainer id
    fireEvent.press(getByTestId('select-item-tr1'));
    expect(onSelect).toHaveBeenCalledWith('tr1');
  });
});
