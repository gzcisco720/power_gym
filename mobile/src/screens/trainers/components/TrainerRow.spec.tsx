import React from 'react';
import { render } from '@testing-library/react-native';
import { TrainerRow } from './TrainerRow';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('TrainerRow', () => {
  it('renders name, email, memberCount and avatar initials', () => {
    const trainer = {
      id: 'trainer1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      memberCount: 5,
    };
    const { getByText, getByTestId } = render(
      <TrainerRow trainer={trainer} onPress={jest.fn()} />,
    );

    // Avatar initials from first+last name
    expect(getByText('AS')).toBeTruthy();
    // Name
    expect(getByText('Alice Smith')).toBeTruthy();
    // Email
    expect(getByText('alice@example.com')).toBeTruthy();
    // Member count
    expect(getByText('5 members')).toBeTruthy();
    // testID pattern
    expect(getByTestId('trainer-row-trainer1')).toBeTruthy();
  });

  it('shows "1 member" (singular) when memberCount is 1', () => {
    const trainer = {
      id: 'trainer2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      memberCount: 1,
    };
    const { getByText } = render(
      <TrainerRow trainer={trainer} onPress={jest.fn()} />,
    );
    expect(getByText('1 member')).toBeTruthy();
  });

  it('shows "0 members" when memberCount is 0', () => {
    const trainer = {
      id: 'trainer3',
      name: 'Carol White',
      email: 'carol@example.com',
      memberCount: 0,
    };
    const { getByText } = render(
      <TrainerRow trainer={trainer} onPress={jest.fn()} />,
    );
    expect(getByText('0 members')).toBeTruthy();
  });
});
