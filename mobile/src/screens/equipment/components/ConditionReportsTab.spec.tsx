/**
 * Stage 5 unit tests — ConditionReportsTab
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../lib/api/equipment.api', () => ({
  fetchConditionReports: jest.fn(),
  createConditionReport: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import * as equipmentApi from '../../../lib/api/equipment.api';
import { ConditionReport, EquipmentItem } from '../../../types/equipment';
import { ConditionReportsTab } from './ConditionReportsTab';

const mockFetchConditionReports = equipmentApi.fetchConditionReports as jest.MockedFunction<
  typeof equipmentApi.fetchConditionReports
>;
const mockCreateConditionReport = equipmentApi.createConditionReport as jest.MockedFunction<
  typeof equipmentApi.createConditionReport
>;

function makeItem(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return {
    _id: 'eq1',
    name: 'Treadmill',
    quantity: 1,
    status: 'active',
    trackCondition: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeReport(overrides: Partial<ConditionReport> = {}): ConditionReport {
  return {
    _id: 'rep1',
    equipmentId: 'eq1',
    note: 'Belt is worn',
    reportedAt: '2024-01-10T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchConditionReports.mockResolvedValue([]);
});

describe('ConditionReportsTab', () => {
  it('trackCondition false renders "Enable condition tracking to use this feature." and no report input', async () => {
    const item = makeItem({ trackCondition: false });
    const { getByText, queryByTestId } = render(<ConditionReportsTab item={item} />);

    expect(getByText('Enable condition tracking to use this feature.')).toBeTruthy();
    expect(queryByTestId('report-note-input')).toBeNull();
  });

  it('no reports renders "No reports yet."', async () => {
    mockFetchConditionReports.mockResolvedValue([]);
    const item = makeItem({ trackCondition: true });
    const { findByText } = render(<ConditionReportsTab item={item} />);

    expect(await findByText('No reports yet.')).toBeTruthy();
  });

  it('submit note calls createConditionReport and prepends the new report to the list', async () => {
    mockFetchConditionReports.mockResolvedValue([]);
    const newReport = makeReport({ note: 'Belt worn' });
    mockCreateConditionReport.mockResolvedValueOnce(newReport);

    const item = makeItem({ trackCondition: true });
    const { getByTestId, findByTestId, findByText } = render(<ConditionReportsTab item={item} />);

    // Wait for the component to finish loading
    await findByText('No reports yet.');

    fireEvent.changeText(getByTestId('report-note-input'), 'Belt worn');
    fireEvent.press(getByTestId('report-submit'));

    await waitFor(() => {
      expect(mockCreateConditionReport).toHaveBeenCalledWith('eq1', 'Belt worn');
    });

    expect(await findByTestId('report-item-0')).toBeTruthy();
  });
});
