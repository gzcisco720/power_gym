/**
 * Stage 5 unit tests — SettingsScreen tab rendering
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('react-native-svg');
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../../stores/profile.store', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('../../../lib/api/gym.api', () => ({
  getGymInfo: jest.fn(),
  updateGymInfo: jest.fn(),
  uploadLogo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '../../../stores/auth.store';
import { useProfileStore } from '../../../stores/profile.store';
import { SettingsScreen } from '../SettingsScreen';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseProfileStore = useProfileStore as jest.MockedFunction<typeof useProfileStore>;

function makeProfileState(overrides: Record<string, unknown> = {}) {
  return {
    profile: null,
    isLoading: false,
    fetchProfile: jest.fn(),
    saveProfile: jest.fn(),
    changePassword: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useProfileStore>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProfileStore.mockReturnValue(makeProfileState());
});

function makeAuthState(role: 'owner' | 'trainer' | 'member') {
  const user = { id: '1', firstName: 'Alice', lastName: 'Smith', role, trainerId: null };
  const state = {
    user,
    accessToken: 'token',
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    hydrate: jest.fn(),
  };
  // Support selector calls — SettingsScreen calls useAuthStore((s) => s.user)
  mockUseAuthStore.mockImplementation((selector?: (s: typeof state) => unknown) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
}

describe('SettingsScreen', () => {
  it('renders 3 tabs (Profile, Security, Gym Info) when role is owner', () => {
    makeAuthState('owner');

    const { getByTestId } = render(<SettingsScreen />);

    expect(getByTestId('settings-tab-profile')).toBeTruthy();
    expect(getByTestId('settings-tab-security')).toBeTruthy();
    expect(getByTestId('settings-tab-gym')).toBeTruthy();
  });

  it('renders exactly 2 tabs (Profile, Security) when role is member', () => {
    makeAuthState('member');

    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    expect(getByTestId('settings-tab-profile')).toBeTruthy();
    expect(getByTestId('settings-tab-security')).toBeTruthy();
    expect(queryByTestId('settings-tab-gym')).toBeNull();
  });

  it('renders the back button', () => {
    makeAuthState('member');

    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('screen-header-back')).toBeTruthy();
  });

  // Stage 5 Sprint Contract: SettingsScreen > Tabs > switches active tab content
  it('Tabs > switches active tab content — pressing Security tab shows SecurityTab panel', () => {
    makeAuthState('owner');

    const { getByTestId, getByText } = render(<SettingsScreen />);

    // Press the Security tab trigger
    fireEvent.press(getByTestId('settings-tab-security'));

    // SecurityTab panel should be visible (it has "Current Password" label)
    expect(getByText('Current Password')).toBeTruthy();
  });
});
