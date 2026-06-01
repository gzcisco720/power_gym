import React from 'react';
import { Text, ScrollView } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

import { Screen } from '../Screen';

describe('Screen', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Screen>
        <Text>Hello</Text>
      </Screen>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('non-scrollable: does not render a ScrollView', () => {
    const { UNSAFE_queryAllByType } = render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
  });

  it('non-scrollable: applies bottom inset as paddingBottom', () => {
    const { getByTestId } = render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    const container = getByTestId('screen-container');
    expect(container.props.style).toEqual(
      expect.objectContaining({ paddingBottom: 34 }),
    );
  });

  it('scrollable: renders a ScrollView', () => {
    const { UNSAFE_getAllByType } = render(
      <Screen scrollable>
        <Text>content</Text>
      </Screen>,
    );
    expect(UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  });

  it('scrollable: applies bottom inset to ScrollView contentContainerStyle', () => {
    const { UNSAFE_getByType } = render(
      <Screen scrollable>
        <Text>content</Text>
      </Screen>,
    );
    const sv = UNSAFE_getByType(ScrollView);
    expect(sv.props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 34 }),
    );
  });

  it('forwards testID to the outer container', () => {
    const { getByTestId } = render(
      <Screen testID="my-screen">
        <Text>content</Text>
      </Screen>,
    );
    expect(getByTestId('my-screen')).toBeTruthy();
  });
});
