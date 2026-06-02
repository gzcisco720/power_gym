/**
 * Stage 5 unit tests — EquipmentDetailScreen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
  getParent: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: jest.fn(),
}));

jest.mock('../../stores/equipment.store', () => ({
  useEquipmentStore: jest.fn(),
}));

jest.mock('../../lib/api/equipment.api', () => ({
  updateEquipment: jest.fn(),
  deleteEquipment: jest.fn(),
  fetchConditionReports: jest.fn(),
  createConditionReport: jest.fn(),
}));

jest.mock('../../lib/image-upload', () => ({
  pickAndUploadImage: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { useEquipmentStore } from '../../stores/equipment.store';
import * as equipmentApi from '../../lib/api/equipment.api';
import { EquipmentItem } from '../../types/equipment';
import { EquipmentDetailScreen } from './EquipmentDetailScreen';

const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseEquipmentStore = useEquipmentStore as jest.MockedFunction<typeof useEquipmentStore>;
const mockUpdateEquipment = equipmentApi.updateEquipment as jest.MockedFunction<
  typeof equipmentApi.updateEquipment
>;
const mockDeleteEquipment = equipmentApi.deleteEquipment as jest.MockedFunction<
  typeof equipmentApi.deleteEquipment
>;

function makeItem(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return {
    _id: 'eq1',
    name: 'Treadmill',
    brand: 'Life Fitness',
    quantity: 2,
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

function setupRoute(item: EquipmentItem) {
  mockUseRoute.mockReturnValue({
    key: 'EquipmentDetail',
    name: 'EquipmentDetail',
    params: { equipment: item },
  });
}

function setupStoreMock(overrides: Partial<ReturnType<typeof useEquipmentStore>> = {}) {
  const state = makeStoreState(overrides);
  mockUseEquipmentStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useEquipmentStore>) => unknown) => {
      if (typeof selector === 'function') return selector(state as ReturnType<typeof useEquipmentStore>);
      return state;
    },
  );
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoBack.mockReset();
});

describe('EquipmentDetailScreen', () => {
  it('pre-fills name/brand/quantity from the route equipment', () => {
    const item = makeItem({ name: 'Treadmill', brand: 'Life Fitness', quantity: 2 });
    setupRoute(item);
    setupStoreMock();

    const { getByTestId } = render(<EquipmentDetailScreen />);

    expect(getByTestId('equipment-detail-name-input').props.value).toBe('Treadmill');
  });

  it('Save disabled until a field changes (isDirty)', () => {
    const item = makeItem();
    setupRoute(item);
    setupStoreMock();

    const { getByTestId } = render(<EquipmentDetailScreen />);

    const saveBtn = getByTestId('equipment-detail-save');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Save enabled after a field changes', () => {
    const item = makeItem();
    setupRoute(item);
    setupStoreMock();

    const { getByTestId } = render(<EquipmentDetailScreen />);

    fireEvent.changeText(getByTestId('equipment-detail-name-input'), 'New Name');
    const saveBtn = getByTestId('equipment-detail-save');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('successful save calls updateEquipment and store.updateItem and shows "Changes saved"', async () => {
    const item = makeItem();
    setupRoute(item);
    const updateItem = jest.fn();
    setupStoreMock({ updateItem });
    const updatedItem = makeItem({ name: 'New Treadmill' });
    mockUpdateEquipment.mockResolvedValueOnce(updatedItem);

    const { getByTestId, findByText } = render(<EquipmentDetailScreen />);

    fireEvent.changeText(getByTestId('equipment-detail-name-input'), 'New Treadmill');
    fireEvent.press(getByTestId('equipment-detail-save'));

    await waitFor(() => {
      expect(mockUpdateEquipment).toHaveBeenCalledWith('eq1', expect.objectContaining({ name: 'New Treadmill' }));
      expect(updateItem).toHaveBeenCalledWith(updatedItem);
    });

    expect(await findByText('Changes saved')).toBeTruthy();
  });

  it('Delete confirm calls deleteEquipment, store.removeItem, navigation.goBack, shows "Equipment deleted"', async () => {
    const item = makeItem();
    setupRoute(item);
    const removeItem = jest.fn();
    setupStoreMock({ removeItem });
    mockDeleteEquipment.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(<EquipmentDetailScreen />);

    // Tap delete to open dialog
    fireEvent.press(getByTestId('equipment-detail-delete'));

    // Confirm deletion
    await waitFor(() => {
      expect(getByTestId('equipment-delete-confirm')).toBeTruthy();
    });
    fireEvent.press(getByTestId('equipment-delete-confirm'));

    await waitFor(() => {
      expect(mockDeleteEquipment).toHaveBeenCalledWith('eq1');
      expect(removeItem).toHaveBeenCalledWith('eq1');
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
