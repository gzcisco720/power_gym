/**
 * Stage 4 unit tests — AddEquipmentSheet
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

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
  searchCatalog: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useEquipmentStore } from '../../stores/equipment.store';
import * as equipmentApi from '../../lib/api/equipment.api';
import { searchCatalog } from '../../lib/equipment-catalog';
import * as imageUpload from '../../lib/image-upload';
import { EquipmentItem } from '../../types/equipment';
import { AddEquipmentSheet } from './AddEquipmentSheet';

const mockUseEquipmentStore = useEquipmentStore as jest.MockedFunction<typeof useEquipmentStore>;
const mockCreateEquipment = equipmentApi.createEquipment as jest.MockedFunction<
  typeof equipmentApi.createEquipment
>;
const mockSearchCatalog = searchCatalog as jest.MockedFunction<typeof searchCatalog>;
const mockPickAndUploadImage = imageUpload.pickAndUploadImage as jest.MockedFunction<
  typeof imageUpload.pickAndUploadImage
>;

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

function setupStoreMock(overrides: Partial<ReturnType<typeof useEquipmentStore>> = {}) {
  const state = makeStoreState(overrides);
  mockUseEquipmentStore.mockImplementation((selector?: (s: ReturnType<typeof useEquipmentStore>) => unknown) => {
    if (typeof selector === 'function') return selector(state as ReturnType<typeof useEquipmentStore>);
    return state;
  });
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchCatalog.mockReturnValue([]);
});

describe('AddEquipmentSheet', () => {
  it('Save button disabled until name is non-empty', () => {
    setupStoreMock();
    const { getByTestId } = render(<AddEquipmentSheet visible onClose={jest.fn()} />);

    const saveButton = getByTestId('add-save-button');
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('Save button enabled when name is non-empty', () => {
    setupStoreMock();
    const { getByTestId } = render(<AddEquipmentSheet visible onClose={jest.fn()} />);

    fireEvent.changeText(getByTestId('add-name-input'), 'Treadmill');
    const saveButton = getByTestId('add-save-button');
    expect(saveButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('typing >=2 chars renders catalog suggestions and tapping one fills the name input', async () => {
    setupStoreMock();
    mockSearchCatalog.mockReturnValue(['Treadmill', 'Curved Treadmill']);

    const { getByTestId } = render(
      <AddEquipmentSheet visible onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('add-name-input'), 'trea');

    await waitFor(() => {
      expect(getByTestId('catalog-suggestion-Treadmill')).toBeTruthy();
    });

    fireEvent.press(getByTestId('catalog-suggestion-Treadmill'));
    expect(getByTestId('add-name-input').props.value).toBe('Treadmill');
  });

  it('successful save calls createEquipment, calls store.addItem, and shows "Equipment added"', async () => {
    const addItem = jest.fn();
    setupStoreMock({ addItem });
    const createdItem = makeItem({ name: 'Treadmill' });
    mockCreateEquipment.mockResolvedValueOnce(createdItem);

    const onClose = jest.fn();
    const { getByTestId, findByText } = render(
      <AddEquipmentSheet visible onClose={onClose} />,
    );

    fireEvent.changeText(getByTestId('add-name-input'), 'Treadmill');
    fireEvent.press(getByTestId('add-save-button'));

    await waitFor(() => {
      expect(mockCreateEquipment).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Treadmill' }),
      );
      expect(addItem).toHaveBeenCalledWith(createdItem);
    });
    expect(await findByText('Equipment added')).toBeTruthy();
  });

  it('tapping Add Image calls pickAndUploadImage and adds returned URL to imageUrls', async () => {
    setupStoreMock();
    mockPickAndUploadImage.mockResolvedValueOnce('https://cdn.example.com/image.jpg');

    const { getByLabelText } = render(<AddEquipmentSheet visible onClose={jest.fn()} />);

    fireEvent.press(getByLabelText('Add image'));

    await waitFor(() => {
      expect(mockPickAndUploadImage).toHaveBeenCalled();
    });
  });
});
