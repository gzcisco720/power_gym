import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

import { ScreenHeader } from '../ScreenHeader';

describe('ScreenHeader', () => {
  it('renders the title text', () => {
    const { getByText } = render(<ScreenHeader title="My Screen" />);
    expect(getByText('My Screen')).toBeTruthy();
  });

  it('renders title and fires onBack when screen-header-back is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <ScreenHeader title="Detail" onBack={onBack} />,
    );

    const backEl = getByTestId('screen-header-back');
    expect(backEl).toBeTruthy();

    fireEvent.press(backEl);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does not render back element when onBack is not provided', () => {
    const { queryByTestId } = render(<ScreenHeader title="Home" />);
    expect(queryByTestId('screen-header-back')).toBeNull();
  });

  it('renders right content when provided', () => {
    const { getByText } = render(
      <ScreenHeader title="Page" right={<React.Fragment />} />,
    );
    expect(getByText('Page')).toBeTruthy();
  });
});
