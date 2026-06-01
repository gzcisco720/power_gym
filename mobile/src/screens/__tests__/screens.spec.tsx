/**
 * Stage 5 unit tests — Auth Screens, Navigation & Biometrics Prompt
 * Uses React Native Testing Library (RNTL)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('react-native-svg');
jest.mock('../../stores/branding.store', () => ({
  useBrandingStore: (selector?: (s: { gymName: string | null; logoUrl: string | null; fetchBranding: () => void }) => unknown) => {
    const state = { gymName: 'Power Gym', logoUrl: null, fetchBranding: jest.fn() };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } },
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const mockUseNavigation = () => ({ navigate: mockNavigate, goBack: mockGoBack });
  const mockUseRoute = () => ({ params: { token: 'test-token-abc' } });
  const mockNavigationContainer = ({ children }: { children: unknown }) => children;
  return {
    useNavigation: mockUseNavigation,
    useRoute: mockUseRoute,
    NavigationContainer: mockNavigationContainer,
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const mockReact = require('react');
  const mockScreen = ({ component: MockComponent }: { component: () => null }) =>
    mockReact.createElement(MockComponent);
  function mockNavigator({ children }: { children: unknown }) {
    return mockReact.createElement(mockReact.Fragment, null, children);
  }
  const mockNavigatorObj = { Navigator: mockNavigator, Screen: mockScreen };
  return {
    createNativeStackNavigator: () => mockNavigatorObj,
  };
});

jest.mock('@react-navigation/drawer', () => {
  const mockReact = require('react');
  const mockScreen = ({ component: MockComponent }: { component: () => null }) =>
    mockReact.createElement(MockComponent);
  function mockNavigator({ children }: { children: unknown }) {
    return mockReact.createElement(mockReact.Fragment, null, children);
  }
  const mockNavigatorObj = { Navigator: mockNavigator, Screen: mockScreen };
  return {
    createDrawerNavigator: () => mockNavigatorObj,
    DrawerContentScrollView: ({ children }: { children: unknown }) => children,
  };
});

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '../../stores/auth.store';
import { LoginScreen } from '../LoginScreen';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
import { ResetPasswordScreen } from '../ResetPasswordScreen';
import { BiometricsPrompt } from '../../components/BiometricsPrompt';
import { RootNavigator } from '../../navigation';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface AuthStateOverrides {
  accessToken?: string | null;
  biometricsEnabled?: boolean;
  login?: jest.Mock;
  setBiometricsEnabled?: jest.Mock;
}

function makeAuthState(overrides: AuthStateOverrides = {}) {
  return {
    accessToken: null,
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

// ── Test Suites ───────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  describe('renders', () => {
    it('shows Email + Password inputs and Sign In button; "Sign in with Face ID" hidden when biometricsEnabled=false, shown when true', () => {
      mockUseAuthStore.mockReturnValue(makeAuthState({ biometricsEnabled: false }));
      const { getByPlaceholderText, getByText, queryByText, rerender } = render(
        <LoginScreen />,
      );

      expect(getByPlaceholderText('your@email.com')).toBeTruthy();
      expect(getByPlaceholderText('••••••••')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(queryByText('Sign in with Face ID')).toBeNull();

      mockUseAuthStore.mockReturnValue(makeAuthState({ biometricsEnabled: true }));
      rerender(<LoginScreen />);
      expect(getByText('Sign in with Face ID')).toBeTruthy();
    });
  });

  describe('submit', () => {
    it('calls auth.login with entered email and password when Sign In is pressed', async () => {
      const loginMock = jest.fn().mockResolvedValue(undefined);
      mockUseAuthStore.mockReturnValue(makeAuthState({ login: loginMock }));

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@example.com');
      fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret123');
      });
    });
  });

  describe('error', () => {
    it('renders invalid-credentials message when auth.login rejects with an auth error', async () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        response: { status: 401 },
      });
      const loginMock = jest.fn().mockRejectedValue(authError);
      mockUseAuthStore.mockReturnValue(makeAuthState({ login: loginMock }));

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@example.com');
      fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpass');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText('Invalid email or password')).toBeTruthy();
      });
    });
  });
});

describe('ForgotPasswordScreen', () => {
  describe('submit', () => {
    it('calls the forgot-password action and renders "Check your email" confirmation on success', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByPlaceholderText('your@email.com'), 'user@example.com');
      fireEvent.press(getByText('Send Reset Link'));

      await waitFor(() => {
        expect(getByText('Check your email')).toBeTruthy();
      });
    });
  });
});

describe('ResetPasswordScreen', () => {
  describe('validation', () => {
    it('shows error and does not submit when New Password and Confirm Password differ', async () => {
      const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);

      fireEvent.changeText(getByPlaceholderText('New password'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirm password'), 'different456');
      fireEvent.press(getByText('Reset Password'));

      await waitFor(() => {
        expect(getByText('Passwords do not match')).toBeTruthy();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    it('calls reset action with route-param token and new password, navigates to Login on success', async () => {
      const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);

      fireEvent.changeText(getByPlaceholderText('New password'), 'newpass123');
      fireEvent.changeText(getByPlaceholderText('Confirm password'), 'newpass123');
      fireEvent.press(getByText('Reset Password'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Login');
      });
    });
  });
});

describe('BiometricsPrompt', () => {
  it('Enable calls setBiometricsEnabled(true); Skip dismisses without changing biometrics state', async () => {
    const mockSetBiometricsEnabled = jest.fn().mockResolvedValue(undefined);
    const mockOnDismiss = jest.fn();

    const { getByText } = render(
      <BiometricsPrompt
        visible={true}
        onDismiss={mockOnDismiss}
        setBiometricsEnabled={mockSetBiometricsEnabled}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('Enable Face ID'));
    });
    expect(mockSetBiometricsEnabled).toHaveBeenCalledWith(true);
    expect(mockOnDismiss).toHaveBeenCalled();

    mockSetBiometricsEnabled.mockClear();
    mockOnDismiss.mockClear();

    const { getByText: getSkipText } = render(
      <BiometricsPrompt
        visible={true}
        onDismiss={mockOnDismiss}
        setBiometricsEnabled={mockSetBiometricsEnabled}
      />,
    );

    fireEvent.press(getSkipText('Skip'));
    expect(mockSetBiometricsEnabled).not.toHaveBeenCalled();
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});

describe('RootNavigator', () => {
  it('renders AuthStack when unauthenticated and AppStack (HomeScreen) when accessToken present', () => {
    mockUseAuthStore.mockReturnValue(makeAuthState({ accessToken: null }));
    const { getByText, rerender, queryByTestId } = render(<RootNavigator />);
    expect(getByText('Sign In')).toBeTruthy();
    expect(queryByTestId('home-screen')).toBeNull();

    mockUseAuthStore.mockReturnValue(makeAuthState({ accessToken: 'some-token' }));
    rerender(<RootNavigator />);
    expect(queryByTestId('home-screen')).toBeTruthy();
  });
});
