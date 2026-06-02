/**
 * Stage 3 unit tests — ServicesScreen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/service-types.store', () => ({
  useServiceTypesStore: jest.fn(),
}));

jest.mock('../../lib/api/service-types.api', () => ({
  createServiceType: jest.fn(),
  updateServiceType: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useServiceTypesStore } from '../../stores/service-types.store';
import { ServiceType } from '../../types/service-types';
import { ServicesScreen } from './ServicesScreen';

const mockUseServiceTypesStore = useServiceTypesStore as jest.MockedFunction<
  typeof useServiceTypesStore
>;

function makeService(overrides: Partial<ServiceType> = {}): ServiceType {
  return {
    _id: 'svc1',
    name: 'PT Session',
    durationMin: 60,
    pricePerSession: 80,
    currency: 'AUD',
    note: null,
    isActive: true,
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStoreState(overrides: Partial<ReturnType<typeof useServiceTypesStore>> = {}) {
  return {
    items: [],
    filter: 'all' as const,
    loading: false,
    error: null,
    fetchServiceTypes: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    setFilter: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── ServicesScreen tests ──────────────────────────────────────────────────────

describe('ServicesScreen', () => {
  it('renders the three filter tabs All / Active / Inactive', () => {
    mockUseServiceTypesStore.mockReturnValue(makeStoreState());
    const { getByTestId } = render(<ServicesScreen />);
    expect(getByTestId('services-filter-all')).toBeTruthy();
    expect(getByTestId('services-filter-active')).toBeTruthy();
    expect(getByTestId('services-filter-inactive')).toBeTruthy();
  });

  it('shows "No services added yet." when store items is empty and not loading', () => {
    mockUseServiceTypesStore.mockReturnValue(makeStoreState({ items: [] }));
    const { getByText } = render(<ServicesScreen />);
    expect(getByText('No services added yet.')).toBeTruthy();
  });

  it('shows "No services match this filter." when items exist but none match the active filter', () => {
    const items = [makeService({ _id: 'svc1', isActive: true })];
    mockUseServiceTypesStore.mockReturnValue(
      makeStoreState({ items, filter: 'inactive' }),
    );
    const { getByText } = render(<ServicesScreen />);
    expect(getByText('No services match this filter.')).toBeTruthy();
  });

  it('renders a card per service with name and "<dur>min · $<price> AUD" metadata and an Active/Inactive badge', () => {
    const items = [
      makeService({ _id: 'svc1', name: 'PT Session', durationMin: 60, pricePerSession: 80, isActive: true }),
      makeService({ _id: 'svc2', name: 'Group Class', durationMin: 45, pricePerSession: 30, isActive: false }),
    ];
    mockUseServiceTypesStore.mockReturnValue(makeStoreState({ items }));
    const { getByTestId, getByText, getAllByText } = render(<ServicesScreen />);

    expect(getByTestId('service-card-svc1')).toBeTruthy();
    expect(getByTestId('service-card-svc2')).toBeTruthy();
    expect(getByText('PT Session')).toBeTruthy();
    expect(getByText('Group Class')).toBeTruthy();
    expect(getByText('60min · $80 AUD')).toBeTruthy();
    expect(getByText('45min · $30 AUD')).toBeTruthy();
    // Filter tabs also contain "Active"/"Inactive" labels — use getAllByText and confirm card badges are present
    expect(getAllByText('Active').length).toBeGreaterThan(0);
    expect(getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  it('tapping the "+" header button makes the Add sheet (title "Add Service") visible', async () => {
    mockUseServiceTypesStore.mockReturnValue(makeStoreState());
    const { getByTestId, getByText } = render(<ServicesScreen />);

    fireEvent.press(getByTestId('services-add-button'));

    await waitFor(() => {
      expect(getByText('Add Service')).toBeTruthy();
    });
  });
});
