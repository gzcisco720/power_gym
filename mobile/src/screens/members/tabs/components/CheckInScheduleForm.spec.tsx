import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CheckInScheduleForm } from './CheckInScheduleForm';

const mockSave = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../../../stores/check-in-schedule.store', () => ({
  useCheckInScheduleStore: (selector: (s: {
    schedule: { dayOfWeek: number; hour: number; minute: number; active: boolean } | null;
    loading: boolean;
    fetchSchedule: jest.Mock;
    saveSchedule: jest.Mock;
  }) => unknown) =>
    selector({
      schedule: null,
      loading: false,
      fetchSchedule: jest.fn(),
      saveSchedule: mockSave,
    }),
}));

describe('CheckInScheduleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('save button is disabled initially (no changes)', () => {
    const { getByTestId } = render(
      <CheckInScheduleForm memberId="mem1" />,
    );
    const saveBtn = getByTestId('schedule-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is enabled after editing the hour field', () => {
    const { getByTestId } = render(
      <CheckInScheduleForm memberId="mem1" />,
    );

    // Change hour (value != initial 9 default)
    fireEvent(getByTestId('schedule-hour-input'), 'changeText', '8');

    const saveBtn = getByTestId('schedule-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('save button is enabled after toggling the active switch', async () => {
    const { getByTestId } = render(
      <CheckInScheduleForm memberId="mem1" />,
    );

    // Initial active is true (default), toggle to false to make it dirty
    await act(async () => {
      fireEvent(getByTestId('schedule-active-switch'), 'valueChange', false);
    });

    const saveBtn = getByTestId('schedule-save-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });
});
