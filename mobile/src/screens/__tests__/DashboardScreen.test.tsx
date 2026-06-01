import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-local-authentication');
jest.mock('expo-secure-store');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/drawer', () => ({}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: () => null,
  LineChart: () => null,
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

import { useAuthStore } from '../../stores/auth.store';
import { DashboardScreen } from '../DashboardScreen';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

function makeAuthState(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'token',
    user: null,
    biometricsEnabled: false,
    isLoading: false,
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setBiometricsEnabled: jest.fn(),
    hydrate: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardScreen', () => {
  it('always renders testID="home-screen" on root', () => {
    mockUseAuthStore.mockReturnValue(makeAuthState({ user: null }));
    const { getByTestId } = render(<DashboardScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders OwnerDashboard branch testID when auth role is owner', () => {
    mockUseAuthStore.mockReturnValue(
      makeAuthState({
        user: { id: '1', firstName: 'Alice', lastName: 'Smith', role: 'owner', trainerId: null },
      }),
    );
    const { getByTestId } = render(<DashboardScreen />);
    expect(getByTestId('owner-dashboard')).toBeTruthy();
  });

  it('renders TrainerDashboard branch testID when auth role is trainer', () => {
    mockUseAuthStore.mockReturnValue(
      makeAuthState({
        user: { id: '2', firstName: 'Bob', lastName: 'Jones', role: 'trainer', trainerId: null },
      }),
    );
    const { getByTestId } = render(<DashboardScreen />);
    expect(getByTestId('trainer-dashboard')).toBeTruthy();
  });

  it('renders MemberDashboard branch testID when auth role is member', () => {
    mockUseAuthStore.mockReturnValue(
      makeAuthState({
        user: { id: '3', firstName: 'Carol', lastName: 'Lee', role: 'member', trainerId: '2' },
      }),
    );
    const { getByTestId } = render(<DashboardScreen />);
    expect(getByTestId('member-dashboard')).toBeTruthy();
  });

  it('renders default branch (owner) when user is null', () => {
    mockUseAuthStore.mockReturnValue(makeAuthState({ user: null }));
    const { getByTestId } = render(<DashboardScreen />);
    // Falls back to owner-dashboard (owner is the top-level role)
    expect(getByTestId('owner-dashboard')).toBeTruthy();
  });
});
