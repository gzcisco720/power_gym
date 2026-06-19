import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

import { Button } from '~/components/ui/button';
import { ScreenHeader } from '../ScreenHeader';

describe('ScreenHeader', () => {
  it('renders the title text', () => {
    const { getByText } = render(<ScreenHeader title="My Screen" />);
    expect(getByText('My Screen')).toBeTruthy();
  });

  it('renders title and fires onBack — screen-header-back is a Reusables Button that calls onBack', () => {
    const onBack = jest.fn();
    const { getByTestId, UNSAFE_getAllByType } = render(
      <ScreenHeader title="Detail" onBack={onBack} />,
    );

    // The back element must exist with that testID
    const backEl = getByTestId('screen-header-back');
    expect(backEl).toBeTruthy();

    // It must be rendered via the Reusables Button component (not a raw Pressable)
    const buttons = UNSAFE_getAllByType(Button);
    expect(buttons.length).toBeGreaterThan(0);

    // Pressing it must call onBack
    fireEvent.press(backEl);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not render back element when onBack is not provided', () => {
    const { queryByTestId } = render(<ScreenHeader title="Home" />);
    expect(queryByTestId('screen-header-back')).toBeNull();
  });

  it('renders right content when provided', () => {
    const { getByText } = render(
      <ScreenHeader title="Page" right={<Button><React.Fragment /></Button>} />,
    );
    expect(getByText('Page')).toBeTruthy();
  });
});
