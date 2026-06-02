/**
 * Stage 3 unit tests — ServiceBottomSheet
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
import * as serviceTypesApi from '../../lib/api/service-types.api';
import { ServiceType } from '../../types/service-types';
import { ServiceBottomSheet } from './ServiceBottomSheet';

const mockUseServiceTypesStore = useServiceTypesStore as jest.MockedFunction<
  typeof useServiceTypesStore
>;
const mockCreateServiceType = serviceTypesApi.createServiceType as jest.MockedFunction<
  typeof serviceTypesApi.createServiceType
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

function setupStoreMock(overrides: Partial<ReturnType<typeof useServiceTypesStore>> = {}) {
  const state = makeStoreState(overrides);
  mockUseServiceTypesStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useServiceTypesStore>) => unknown) => {
      if (typeof selector === 'function')
        return selector(state as ReturnType<typeof useServiceTypesStore>);
      return state;
    },
  );
  return state;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Add mode tests ────────────────────────────────────────────────────────────

describe('ServiceBottomSheet (Add mode)', () => {
  it('save button is disabled when Name is empty', () => {
    setupStoreMock();
    const { getByTestId } = render(
      <ServiceBottomSheet visible onClose={jest.fn()} />,
    );
    expect(getByTestId('service-save-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is enabled when Name, Duration, and Price are all non-empty', () => {
    setupStoreMock();
    const { getByTestId } = render(
      <ServiceBottomSheet visible onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('service-name-input'), 'PT Session');
    fireEvent.changeText(getByTestId('service-duration-input'), '60');
    fireEvent.changeText(getByTestId('service-price-input'), '80');

    expect(getByTestId('service-save-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('filling Name/Duration/Price and pressing Save calls createServiceType and then store addItem, and the sheet dismisses', async () => {
    const addItem = jest.fn();
    setupStoreMock({ addItem });
    const createdService = makeService({ name: 'PT Session', durationMin: 60, pricePerSession: 80 });
    mockCreateServiceType.mockResolvedValueOnce(createdService);

    const onClose = jest.fn();
    const { getByTestId } = render(
      <ServiceBottomSheet visible onClose={onClose} />,
    );

    fireEvent.changeText(getByTestId('service-name-input'), 'PT Session');
    fireEvent.changeText(getByTestId('service-duration-input'), '60');
    fireEvent.changeText(getByTestId('service-price-input'), '80');
    fireEvent.press(getByTestId('service-save-button'));

    await waitFor(() => {
      expect(mockCreateServiceType).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'PT Session', durationMin: 60, pricePerSession: 80 }),
      );
      expect(addItem).toHaveBeenCalledWith(createdService);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

// ── Edit mode tests ───────────────────────────────────────────────────────────

describe('ServiceBottomSheet (Edit mode)', () => {
  it('renders pre-filled with the passed service values and shows the Active toggle', () => {
    setupStoreMock();
    const service = makeService({ name: 'Group Class', durationMin: 45, pricePerSession: 30, isActive: true });
    const { getByTestId } = render(
      <ServiceBottomSheet visible onClose={jest.fn()} service={service} />,
    );

    expect(getByTestId('service-name-input').props.value).toBe('Group Class');
    expect(getByTestId('service-duration-input').props.value).toBe('45');
    expect(getByTestId('service-price-input').props.value).toBe('30');
    expect(getByTestId('service-active-toggle')).toBeTruthy();
  });

  it('save button is disabled until a field changes (dirty detection)', () => {
    setupStoreMock();
    const service = makeService({ name: 'PT Session', durationMin: 60, pricePerSession: 80 });
    const { getByTestId } = render(
      <ServiceBottomSheet visible onClose={jest.fn()} service={service} />,
    );

    // Initially not dirty — save disabled
    expect(getByTestId('service-save-button').props.accessibilityState?.disabled).toBe(true);

    // Change name — now dirty — save enabled
    fireEvent.changeText(getByTestId('service-name-input'), 'PT Session Updated');
    expect(getByTestId('service-save-button').props.accessibilityState?.disabled).toBe(false);
  });
});
