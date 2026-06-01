import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    const { getByText } = render(
      <StatCard label="MEMBERS" value="42" />,
    );
    expect(getByText('MEMBERS')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });

  it('renders delta text when provided', () => {
    const { getByText } = render(
      <StatCard label="SESSIONS" value="12" delta="+3 this month" deltaVariant="success" />,
    );
    expect(getByText('+3 this month')).toBeTruthy();
  });

  it('applies success delta color class when deltaVariant is success', () => {
    const { getByTestId } = render(
      <StatCard
        label="MEMBERS"
        value="10"
        delta="+2 joined"
        deltaVariant="success"
        testID="stat-card"
      />,
    );
    const deltaEl = getByTestId('stat-card-delta');
    expect(deltaEl.props.className).toContain('text-emerald-300');
  });

  it('applies danger delta color class when deltaVariant is danger', () => {
    const { getByTestId } = render(
      <StatCard
        label="SESSIONS"
        value="5"
        delta="-10% vs last month"
        deltaVariant="danger"
        testID="stat-card"
      />,
    );
    const deltaEl = getByTestId('stat-card-delta');
    expect(deltaEl.props.className).toContain('text-red-300');
  });

  it('applies muted delta color class when deltaVariant is muted', () => {
    const { getByTestId } = render(
      <StatCard
        label="ACTIVE TODAY"
        value="3"
        delta="sessions started today"
        deltaVariant="muted"
        testID="stat-card"
      />,
    );
    const deltaEl = getByTestId('stat-card-delta');
    expect(deltaEl.props.className).toContain('text-foreground/40');
  });

  it('applies warning delta color class when deltaVariant is warning', () => {
    const { getByTestId } = render(
      <StatCard
        label="INVITES"
        value="5"
        delta="2 expiring soon"
        deltaVariant="warning"
        testID="stat-card"
      />,
    );
    const deltaEl = getByTestId('stat-card-delta');
    expect(deltaEl.props.className).toContain('text-amber-300');
  });

  it('does not render delta element when delta is not provided', () => {
    const { queryByTestId } = render(
      <StatCard label="TRAINERS" value="4" testID="stat-card" />,
    );
    expect(queryByTestId('stat-card-delta')).toBeNull();
  });
});
