/**
 * Stage 3 unit tests — CreateInviteBottomSheet
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
  it('owner sees both trainer and member role options', () => {
    setupStoreMock({ trainers: trainerOptions });
    setupAuthMock('owner');

    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    expect(getByTestId('invite-role-trainer')).toBeTruthy();
    expect(getByTestId('invite-role-member')).toBeTruthy();
  });

  it('trainer sees member role only and no trainer picker', () => {
    setupStoreMock();
    setupAuthMock('trainer');

    const { getByTestId, queryByTestId: qByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    expect(getByTestId('invite-role-member')).toBeTruthy();
    expect(qByTestId('invite-role-trainer')).toBeNull();
    expect(qByTestId('invite-trainer-picker')).toBeNull();
  });

  it('owner selecting role "member" reveals the trainer picker and keeps save disabled until a trainer is chosen', () => {
    setupStoreMock({ trainers: trainerOptions });
    setupAuthMock('owner');

    const { getByTestId } = render(
      <CreateInviteBottomSheet visible onClose={jest.fn()} />,
    );

    // Initially trainer role is selected (or member), check picker not visible before selecting member
    fireEvent.press(getByTestId('invite-role-member'));

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

    // Select trainer role (doesn't need trainerId)
    fireEvent.press(getByTestId('invite-role-trainer'));

    // Save must be disabled with empty email
    expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);

    // Invalid email
    fireEvent.changeText(getByTestId('invite-email-input'), 'not-an-email');
    expect(getByTestId('invite-save-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('successful save calls createInvite with the form values and addItem with the result', async () => {
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
    fireEvent.press(getByTestId('invite-role-trainer'));
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
