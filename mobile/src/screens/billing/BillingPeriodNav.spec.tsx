/**
 * Unit tests — BillingPeriodNav
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { BillingPeriodNav } from './BillingPeriodNav';
import { BillingPeriod } from '../../types/billing';

describe('BillingPeriodNav', () => {
  it('renders the current period label and prev/next buttons', () => {
    const onChange = jest.fn();
    const period: BillingPeriod = {
      from: new Date(2026, 5, 1),
      to: new Date(2026, 5, 30, 23, 59, 59, 999),
      label: 'June 2026',
    };

    const { getByTestId, getByText } = render(
      <BillingPeriodNav period={period} onChange={onChange} />,
    );

    expect(getByTestId('billing-period-label')).toBeTruthy();
    expect(getByText('June 2026')).toBeTruthy();
    expect(getByTestId('billing-period-prev')).toBeTruthy();
    expect(getByTestId('billing-period-next')).toBeTruthy();
  });

  it('pressing Next advances the label to the next month and calls onChange with that month boundaries', () => {
    const onChange = jest.fn();
    const period: BillingPeriod = {
      from: new Date(2026, 5, 1),
      to: new Date(2026, 5, 30, 23, 59, 59, 999),
      label: 'June 2026',
    };

    const { getByTestId } = render(
      <BillingPeriodNav period={period} onChange={onChange} />,
    );

    fireEvent.press(getByTestId('billing-period-next'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const called = onChange.mock.calls[0][0] as BillingPeriod;
    expect(called.from.getFullYear()).toBe(2026);
    expect(called.from.getMonth()).toBe(6); // July
    expect(called.from.getDate()).toBe(1);
    expect(called.to.getMonth()).toBe(6); // July
    expect(called.to.getDate()).toBe(31);
    expect(called.to.getHours()).toBe(23);
    expect(called.to.getMinutes()).toBe(59);
    expect(called.to.getSeconds()).toBe(59);
    expect(called.to.getMilliseconds()).toBe(999);
  });

  it('pressing Prev goes to the previous month and calls onChange', () => {
    const onChange = jest.fn();
    const period: BillingPeriod = {
      from: new Date(2026, 5, 1),
      to: new Date(2026, 5, 30, 23, 59, 59, 999),
      label: 'June 2026',
    };

    const { getByTestId } = render(
      <BillingPeriodNav period={period} onChange={onChange} />,
    );

    fireEvent.press(getByTestId('billing-period-prev'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const called = onChange.mock.calls[0][0] as BillingPeriod;
    expect(called.from.getMonth()).toBe(4); // May
    expect(called.from.getDate()).toBe(1);
    expect(called.to.getMonth()).toBe(4); // May
    expect(called.to.getDate()).toBe(31);
  });
});
