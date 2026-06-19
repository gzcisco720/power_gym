/**
 * Stage 5 unit tests — SecurityTab
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');

jest.mock('../../../stores/profile.store', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useProfileStore } from '../../../stores/profile.store';
import { useAuthStore } from '../../../stores/auth.store';
import { SecurityTab } from '../tabs/SecurityTab';

const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

function makeAuthState(overrides: Record<string, unknown> = {}) {
  const setBiometricsEnabled = jest.fn().mockResolvedValue(undefined);
  const state = {
    accessToken: 'token',
    user: { id: '1', firstName: 'Alice', lastName: 'Smith', role: 'owner' as const, trainerId: null },
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled,
    hydrate: jest.fn(),
    ...overrides,
  };
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
  return state;
}

function makeProfileState(overrides: Record<string, unknown> = {}) {
  return {
    profile: null,
    isLoading: false,
    fetchProfile: jest.fn(),
    saveProfile: jest.fn(),
    changePassword: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as ReturnType<typeof useProfileStore>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProfileStore.mockReturnValue(makeProfileState());
  makeAuthState();
});

describe('SecurityTab', () => {
  // Stage 5 Sprint Contract: SecurityTab > Switch > toggles biometric setting
  it('Switch > toggles biometric setting — pressing Reusables Switch calls setBiometricsEnabled', () => {
    const setBiometricsEnabled = jest.fn().mockResolvedValue(undefined);
    makeAuthState({ setBiometricsEnabled });

    const { getByTestId } = render(<SecurityTab />);

    // The biometric switch should be present
    const biometricSwitch = getByTestId('security-biometric-switch');
    fireEvent.press(biometricSwitch);

    expect(setBiometricsEnabled).toHaveBeenCalledWith(true);
  });

  it('biometric switch reflects current biometricsEnabled state', () => {
    makeAuthState({ biometricsEnabled: true });

    const { getByTestId } = render(<SecurityTab />);

    const biometricSwitch = getByTestId('security-biometric-switch');
    // Switch should be checked when biometricsEnabled is true
    expect(biometricSwitch.props.accessibilityState?.checked).toBe(true);
  });
});
