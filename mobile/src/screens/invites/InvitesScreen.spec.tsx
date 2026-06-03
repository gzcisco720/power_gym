/**
 * Stage 3 unit tests — InvitesScreen
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
  revokeInvite: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useInvitesStore } from '../../stores/invites.store';
import { useAuthStore } from '../../stores/auth.store';
import * as invitesApi from '../../lib/api/invites.api';
import { Invite } from '../../types/invites';
import { InvitesScreen } from './InvitesScreen';

const mockUseInvitesStore = useInvitesStore as jest.MockedFunction<typeof useInvitesStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockRevokeInvite = invitesApi.revokeInvite as jest.MockedFunction<typeof invitesApi.revokeInvite>;

const now = new Date('2024-06-01T12:00:00.000Z');

function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    _id: 'inv1',
    token: 'tok-abc',
    role: 'member',
    recipientEmail: 'user@example.com',
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // future = pending
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

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(now);
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InvitesScreen', () => {
  it('renders a card per invite returned by the store with its recipientEmail', () => {
    const items = [
      makeInvite({ _id: 'inv1', recipientEmail: 'alice@example.com' }),
      makeInvite({ _id: 'inv2', recipientEmail: 'bob@example.com' }),
    ];
    setupStoreMock({ items });
    setupAuthMock('owner');

    const { getByTestId, getByText } = render(<InvitesScreen />);

    expect(getByTestId('invite-card-inv1')).toBeTruthy();
    expect(getByTestId('invite-card-inv2')).toBeTruthy();
    expect(getByText('alice@example.com')).toBeTruthy();
    expect(getByText('bob@example.com')).toBeTruthy();
  });

  it('shows a revoke button only on pending invites (not on used or expired)', () => {
    const pendingInvite = makeInvite({
      _id: 'pending1',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
    });
    const usedInvite = makeInvite({
      _id: 'used1',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      usedAt: '2024-05-31T10:00:00.000Z',
    });
    const expiredInvite = makeInvite({
      _id: 'expired1',
      expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
    });

    setupStoreMock({ items: [pendingInvite, usedInvite, expiredInvite] });
    setupAuthMock('owner');

    const { getByTestId, queryByTestId } = render(<InvitesScreen />);

    expect(getByTestId('invite-revoke-pending1')).toBeTruthy();
    expect(queryByTestId('invite-revoke-used1')).toBeNull();
    expect(queryByTestId('invite-revoke-expired1')).toBeNull();
  });

  it('tapping the revoke confirm button calls revokeInvite then removeItem for that id', async () => {
    const removeItem = jest.fn();
    mockRevokeInvite.mockResolvedValueOnce(undefined);
    const pending = makeInvite({ _id: 'inv1' });
    setupStoreMock({ items: [pending], removeItem });
    setupAuthMock('owner');

    const { getByTestId } = render(<InvitesScreen />);

    // Tap revoke button to show confirmation dialog
    fireEvent.press(getByTestId('invite-revoke-inv1'));

    // Confirm in the dialog
    await waitFor(() => {
      expect(getByTestId('invite-revoke-confirm')).toBeTruthy();
    });
    fireEvent.press(getByTestId('invite-revoke-confirm'));

    await waitFor(() => {
      expect(mockRevokeInvite).toHaveBeenCalledWith('inv1');
      expect(removeItem).toHaveBeenCalledWith('inv1');
    });
  });
});
