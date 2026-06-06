/**
 * Unit tests — RpeSheet
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RpeSheet } from './RpeSheet';

describe('RpeSheet', () => {
  it('renders with visible=true and shows 10 RPE buttons', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByTestId } = render(
      <RpeSheet visible={true} onConfirm={onConfirm} onDismiss={onDismiss} />,
    );

    expect(getByTestId('rpe-sheet')).toBeTruthy();
    for (let i = 1; i <= 10; i++) {
      expect(getByTestId(`rpe-button-${i}`)).toBeTruthy();
    }
  });

  it('calls onConfirm with the selected rpe value when confirm is tapped', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByTestId } = render(
      <RpeSheet visible={true} onConfirm={onConfirm} onDismiss={onDismiss} />,
    );

    fireEvent.press(getByTestId('rpe-button-7'));
    fireEvent.press(getByTestId('rpe-confirm-button'));

    expect(onConfirm).toHaveBeenCalledWith(7);
  });

  it('calls onDismiss when the cancel button is tapped', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByTestId } = render(
      <RpeSheet visible={true} onConfirm={onConfirm} onDismiss={onDismiss} />,
    );

    fireEvent.press(getByTestId('rpe-cancel-button'));

    expect(onDismiss).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when visible=false', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { queryByTestId } = render(
      <RpeSheet visible={false} onConfirm={onConfirm} onDismiss={onDismiss} />,
    );

    expect(queryByTestId('rpe-sheet')).toBeNull();
  });
});
