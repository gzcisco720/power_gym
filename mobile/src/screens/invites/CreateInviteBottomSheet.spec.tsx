/**
 * Stage 5 unit tests — CreateInviteBottomSheet
 * Updated to work with Reusables Select for role picker (owner only)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../stores/invites.store', () => ({
  useInvitesStore: jest.fn(),
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../lib/api/invites.api', () => ({
  createInvite: jest.fn(),
}));

// Mock Reusables Select to be testable — renders a flat list of pressable items.
// SelectItem presses immediately call the parent's onValueChange via a ref pattern.
jest.mock('~/components/ui/select', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const mockCtx = mockReact.createContext({ value: undefined, onValueChange: undefined });

  const mockSelect = ({ value, onValueChange, children }) =>
    mockReact.createElement(mockCtx.Provider, { value: { value, onValueChange } }, children);

  const mockSelectTrigger = ({ children, testID }) =>
    mockReact.createElement(mockRN.View, { testID }, children);

  const mockSelectValue = ({ placeholder }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(mockRN.Text, null, ctx.value?.label || placeholder || '');
  };

  const mockSelectContent = ({ children }) =>
    mockReact.createElement(mockRN.View, null, children);

  const mockSelectItem = ({ value: itemValue, label, testID }) => {
    const ctx = mockReact.useContext(mockCtx);
    return mockReact.createElement(
      mockRN.Pressable,
      {
        testID: testID || ('select-item-' + itemValue),
        onPress: () => ctx.onValueChange && ctx.onValueChange({ value: itemValue, label }),
        accessibilityLabel: label,
      },
      mockReact.createElement(mockRN.Text, null, label),
    );
  };

  return {
    __esModule: true,
    Select: mockSelect,
    SelectTrigger: mockSelectTrigger,
    SelectValue: mockSelectValue,
    SelectContent: mockSelectContent,
    SelectItem: mockSelectItem,
    SelectGroup: ({ children }) => mockReact.createElement(mockReact.Fragment, null, children),
    SelectLabel: ({ children }) => mockReact.createElement(mockRN.Text, null, children),
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import { useInvitesStore } from '../../stores/invites.store';
import { useAuthStore } from '../../stores/auth.store';
import * as invitesApi from '../../lib/api/invites.api';
import { Invite, TrainerOption } from '../../types/invites';
import { CreateInviteBottomSheet } from './CreateInviteBottomSheet';

const mockUseInvitesStore = useInvitesStore as jest.MockedFunction<typeof useInvitesStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockCreateInvite = invitesApi.createInvite as jest.MockedFunction<typeof invitesApi.createInvite>;

function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    _id: 'inv1',
    token: 'tok-abc',
    role: 'member',
    recipientEmail: 'user@example.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    trainerId: 'trainer1',
    invitedBy: 'owner1',
    ...overrides,
  };
}

function makeStoreState(
  overrides: Partial<ReturnType<typeof useInvitesStore>> = {},
): ReturnType<typeof useInvitesStore> {
  return {
    items: [],
    trainers: [],
    loading: false,
    error: null,
    fetchInvites: jest.fn(),
    fetchTrainers: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useInvitesStore>;
}

function setupStoreMock(overrides: Partial<ReturnType<typeof useInvitesStore>> = {}) {
  const state = makeStoreState(overrides);
  mockUseInvitesStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useInvitesStore>) => unknown) => {
      if (typeof selector === 'function')
        return selector(state as ReturnType<typeof useInvitesStore>);
      return state;
    },
  );
  return state;
}

function setupAuthMock(role: 'owner' | 'trainer' | 'member' = 'owner') {
  const state = {
    accessToken: 'token',
    user: { id: 'user1', firstName: 'Test', lastName: 'User', role, trainerId: null },
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    hydrate: jest.fn(),
  } as ReturnType<typeof useAuthStore>;
  mockUseAuthStore.mockImplementation(
    (selector?: (s: ReturnType<typeof useAuthStore>) => unknown) => {
      if (typeof selector === 'function') return selector(state);
      return state;
    },
  );
}

const trainerOptions: TrainerOption[] = [
  { _id: 'trainer1', name: 'Alice Trainer' },
  { _id: 'trainer2', name: 'Bob Trainer' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreateInviteBottomSheet', () => {
  it('owner sees role selector (Select trigger visible)', () => {
    setupStoreMock({ trainers: trainerOptions });
    setupAuthMock('owner');

    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    expect(getByTestId('invite-role-select-trigger')).toBeTruthy();
  });

  it('trainer does not see role selector (fixed Member role)', () => {
    setupStoreMock();
    setupAuthMock('trainer');

    const { queryByTestId, getByText } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    expect(queryByTestId('invite-role-select-trigger')).toBeNull();
    expect(getByText('Member')).toBeTruthy();
  });

  it('owner selecting role "member" reveals the trainer picker and keeps save disabled until a trainer is chosen', () => {
    setupStoreMock({ trainers: trainerOptions });
    setupAuthMock('owner');

    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    // Select member role via mocked Select item
    fireEvent.press(getByTestId('select-item-member'));

    // Trainer picker should now be visible
    expect(getByTestId('invite-trainer-picker')).toBeTruthy();

    // Fill email — save still disabled without trainer
    fireEvent.changeText(getByTestId('invite-email-input'), 'test@example.com');
    expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is disabled when the email is empty/invalid', () => {
    setupStoreMock({ trainers: trainerOptions });
    setupAuthMock('owner');

    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    // Select trainer role
    fireEvent.press(getByTestId('select-item-trainer'));

    // Save must be disabled with empty email
    expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);

    // Invalid email
    fireEvent.changeText(getByTestId('invite-email-input'), 'not-an-email');
    expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);
  });

  // Stage 5 Sprint Contract: CreateInviteBottomSheet > submit > calls create invite with role
  it('submit > calls create invite with role — selecting role via Select and submitting calls handler with that role', async () => {
    const addItem = jest.fn();
    setupStoreMock({ trainers: trainerOptions, addItem });
    setupAuthMock('owner');

    const createdInvite = makeInvite({ role: 'trainer', recipientEmail: 'trainer@example.com', trainerId: null });
    mockCreateInvite.mockResolvedValueOnce(createdInvite);

    const onClose = jest.fn();
    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={onClose} />,
    );

    // Select trainer role via Reusables Select mock
    fireEvent.press(getByTestId('select-item-trainer'));
    // Enter email
    fireEvent.changeText(getByTestId('invite-email-input'), 'trainer@example.com');
    // Save
    fireEvent.press(getByTestId('invite-save-button'));

    await waitFor(() => {
      expect(mockCreateInvite).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'trainer', recipientEmail: 'trainer@example.com' }),
      );
      expect(addItem).toHaveBeenCalledWith(createdInvite);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── Stage 1 Sprint Contract: trainer picker via Select ───────────────────

  describe('trainer picker', () => {
    it('renders a Select with one SelectItem per trainer (label = trainer name)', () => {
      setupStoreMock({ trainers: trainerOptions });
      setupAuthMock('owner');

      const { getByTestId, getByText } = render(
        <CreateInviteBottomSheet visible onClose={jest.fn()} />,
      );

      // Switch to member role to reveal the trainer picker
      fireEvent.press(getByTestId('select-item-member'));

      expect(getByTestId('invite-trainer-select-trigger')).toBeTruthy();
      expect(getByText('Alice Trainer')).toBeTruthy();
      expect(getByText('Bob Trainer')).toBeTruthy();
    });

    it('selecting a trainer sets trainerId and enables Send when owner+member+valid email', () => {
      setupStoreMock({ trainers: trainerOptions });
      setupAuthMock('owner');

      const { getByTestId } = render(
        <CreateInviteBottomSheet visible onClose={jest.fn()} />,
      );

      // Switch to member role
      fireEvent.press(getByTestId('select-item-member'));
      // Enter valid email
      fireEvent.changeText(getByTestId('invite-email-input'), 'member@example.com');
      // No trainer yet — save disabled
      expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);
      // Select trainer via Select item
      fireEvent.press(getByTestId('select-item-trainer1'));
      // Now save is enabled
      expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(false);
    });

    it('Send is disabled while needsTrainer and no trainer chosen', () => {
      setupStoreMock({ trainers: trainerOptions });
      setupAuthMock('owner');

      const { getByTestId } = render(
        <CreateInviteBottomSheet visible onClose={jest.fn()} />,
      );

      // Switch to member role and enter valid email
      fireEvent.press(getByTestId('select-item-member'));
      fireEvent.changeText(getByTestId('invite-email-input'), 'member@example.com');

      // Save must be disabled — no trainer selected
      expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('successful trainer-role save calls createInvite with trainer role', async () => {
    const addItem = jest.fn();
    setupStoreMock({ trainers: trainerOptions, addItem });
    setupAuthMock('owner');

    const createdInvite = makeInvite({ role: 'trainer', recipientEmail: 'trainer@example.com', trainerId: null });
    mockCreateInvite.mockResolvedValueOnce(createdInvite);

    const onClose = jest.fn();
    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={onClose} />,
    );

    // Select trainer role
    fireEvent.press(getByTestId('select-item-trainer'));
    // Enter email
    fireEvent.changeText(getByTestId('invite-email-input'), 'trainer@example.com');
    // Save
    fireEvent.press(getByTestId('invite-save-button'));

    await waitFor(() => {
      expect(mockCreateInvite).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'trainer', recipientEmail: 'trainer@example.com' }),
      );
      expect(addItem).toHaveBeenCalledWith(createdInvite);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
