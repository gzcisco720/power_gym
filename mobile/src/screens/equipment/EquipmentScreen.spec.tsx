/**
 * Stage 4 unit tests — EquipmentScreen and EquipmentCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/equipment.store', () => ({
  useEquipmentStore: jest.fn(),
}));

jest.mock('../../lib/api/equipment.api', () => ({
  createEquipment: jest.fn(),
}));

jest.mock('../../lib/image-upload', () => ({
  pickAndUploadImage: jest.fn(),
}));

jest.mock('../../lib/equipment-catalog', () => ({
  searchCatalog: jest.fn().mockReturnValue([]),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useEquipmentStore } from '../../stores/equipment.store';
import { EquipmentItem } from '../../types/equipment';
import { EquipmentScreen } from './EquipmentScreen';
import { EquipmentCard } from './components/EquipmentCard';

const mockUseEquipmentStore = useEquipmentStore as jest.MockedFunction<typeof useEquipmentStore>;

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

function makeStoreState(overrides: Partial<ReturnType<typeof useEquipmentStore>> = {}) {
  return {
    items: [],
    filter: 'all' as const,
    loading: false,
    error: null,
    fetchEquipment: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    setFilter: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── EquipmentCard tests ───────────────────────────────────────────────────────

describe('EquipmentCard', () => {
  it('renders equipment name and status badge when trackCondition is true', () => {
    const item = makeItem({ name: 'Rowing Machine', status: 'active', trackCondition: true });
    const { getByText } = render(
      <EquipmentCard item={item} onPress={jest.fn()} />,
    );
    expect(getByText('Rowing Machine')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
  });

  it('does not render status badge when trackCondition is false', () => {
    const item = makeItem({ name: 'Rowing Machine', status: 'active', trackCondition: false });
    const { getByText, queryByText } = render(
      <EquipmentCard item={item} onPress={jest.fn()} />,
    );
    expect(getByText('Rowing Machine')).toBeTruthy();
    expect(queryByText('Active')).toBeNull();
  });

  it('nextServiceDate in the past renders an Overdue badge', () => {
    const item = makeItem({ nextServiceDate: '2020-01-01T00:00:00.000Z' });
    const { getByText } = render(
      <EquipmentCard item={item} onPress={jest.fn()} />,
    );
    expect(getByText('Overdue')).toBeTruthy();
  });

  it('nextServiceDate in the future does not render an Overdue badge', () => {
    const item = makeItem({ nextServiceDate: '2099-01-01T00:00:00.000Z' });
    const { queryByText } = render(
      <EquipmentCard item={item} onPress={jest.fn()} />,
    );
    expect(queryByText('Overdue')).toBeNull();
  });

  it('has the correct testID', () => {
    const item = makeItem({ _id: 'abc123' });
    const { getByTestId } = render(
      <EquipmentCard item={item} onPress={jest.fn()} />,
    );
    expect(getByTestId('equipment-card-abc123')).toBeTruthy();
  });
});

// ── EquipmentScreen tests ─────────────────────────────────────────────────────

describe('EquipmentScreen', () => {
  it('renders one card per store item with name and status badge', () => {
    const items = [
      makeItem({ _id: 'eq1', name: 'Treadmill', status: 'active' }),
      makeItem({ _id: 'eq2', name: 'Rowing Machine', status: 'maintenance' }),
    ];
    mockUseEquipmentStore.mockReturnValue(makeStoreState({ items }));

    const { getByText } = render(<EquipmentScreen />);
    expect(getByText('Treadmill')).toBeTruthy();
    expect(getByText('Rowing Machine')).toBeTruthy();
  });

  it('filter "Active" tab shows only active items', () => {
    const items = [
      makeItem({ _id: 'eq1', name: 'Treadmill', status: 'active' }),
      makeItem({ _id: 'eq2', name: 'Rowing Machine', status: 'maintenance' }),
    ];
    const setFilter = jest.fn();
    mockUseEquipmentStore.mockReturnValue(
      makeStoreState({ items, filter: 'active', setFilter }),
    );

    const { queryByText } = render(<EquipmentScreen />);
    expect(queryByText('Treadmill')).toBeTruthy();
    expect(queryByText('Rowing Machine')).toBeNull();
  });

  it('empty store renders "No equipment added yet."', () => {
    mockUseEquipmentStore.mockReturnValue(makeStoreState({ items: [] }));
    const { getByText } = render(<EquipmentScreen />);
    expect(getByText('No equipment added yet.')).toBeTruthy();
  });

  it('filter with no matches renders "No equipment matches this filter."', () => {
    const items = [makeItem({ _id: 'eq1', name: 'Treadmill', status: 'active' })];
    mockUseEquipmentStore.mockReturnValue(
      makeStoreState({ items, filter: 'maintenance' }),
    );
    const { getByText } = render(<EquipmentScreen />);
    expect(getByText('No equipment matches this filter.')).toBeTruthy();
  });

  it('filter tabs are rendered and tapping Active calls setFilter', () => {
    const setFilter = jest.fn();
    mockUseEquipmentStore.mockReturnValue(makeStoreState({ setFilter }));
    const { getByTestId } = render(<EquipmentScreen />);
    fireEvent.press(getByTestId('equipment-filter-active'));
    expect(setFilter).toHaveBeenCalledWith('active');
  });

  it('loading > renders Skeleton rows', () => {
    mockUseEquipmentStore.mockReturnValue(makeStoreState({ loading: true }));
    const { getAllByTestId } = render(<EquipmentScreen />);
    expect(getAllByTestId('equipment-skeleton-row').length).toBeGreaterThan(0);
  });
});
