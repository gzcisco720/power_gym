/**
 * Stage 2 unit tests — Auth Screens (Sprint Contract)
 * Five acceptance tests for LoginScreen, ForgotPasswordScreen, ResetPasswordScreen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('react-native-svg');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../src/lib/api/client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } },
  },
}));

jest.mock('../../src/stores/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigateFn, goBack: mockGoBackFn }),
  useRoute: () => ({ params: { token: 'test-token-abc' } }),
}));

// These are referenced in the jest.mock factory above — they are hoisted by Jest
// so they must be var (not const/let) to be available at hoist time
// eslint-disable-next-line no-var
var mockNavigateFn = jest.fn();
// eslint-disable-next-line no-var
var mockGoBackFn = jest.fn();

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '../../src/stores/auth.store';
import { apiClient } from '../../src/lib/api/client';
import { LoginScreen } from '../../src/screens/LoginScreen';
import { ForgotPasswordScreen } from '../../src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../../src/screens/ResetPasswordScreen';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockApiPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

function makeAuthState(overrides: {
  biometricsEnabled?: boolean;
  login?: jest.Mock;
  loginWithBiometrics?: jest.Mock;
} = {}) {
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
  mockApiPost.mockResolvedValue({ data: {} });
  mockUseAuthStore.mockReturnValue(makeAuthState());
});

// ── Sprint Contract Tests ─────────────────────────────────────────────────────

describe('LoginScreen', () => {
  describe('handleSignIn', () => {
    it('calls authStore.login with entered email and password', async () => {
      const loginMock = jest.fn().mockResolvedValue(undefined);
      mockUseAuthStore.mockReturnValue(makeAuthState({ login: loginMock }));

      const { getByTestId } = render(<LoginScreen />);

      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'secret123');
      fireEvent.press(getByTestId('login-sign-in-button'));

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledTimes(1);
        expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret123');
      });
    });

    it('shows "Invalid email or password" on 401', async () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        response: { status: 401 },
      });
      const loginMock = jest.fn().mockRejectedValue(authError);
      mockUseAuthStore.mockReturnValue(makeAuthState({ login: loginMock }));

      const { getByTestId } = render(<LoginScreen />);

      fireEvent.changeText(getByTestId('login-email-input'), 'user@example.com');
      fireEvent.changeText(getByTestId('login-password-input'), 'wrongpass');
      fireEvent.press(getByTestId('login-sign-in-button'));

      await waitFor(() => {
        expect(getByTestId('login-error-message').props.children).toBe('Invalid email or password');
      });
    });
  });

  describe('biometric branch', () => {
    it('renders Face ID button only when biometricsEnabled; pressing it calls loginWithBiometrics', async () => {
      const loginWithBiometricsMock = jest.fn().mockResolvedValue(undefined);

      // biometricsEnabled = false: no Face ID button
      mockUseAuthStore.mockReturnValue(makeAuthState({ biometricsEnabled: false }));
      const { queryByTestId, rerender } = render(<LoginScreen />);
      expect(queryByTestId('login-face-id-button')).toBeNull();

      // biometricsEnabled = true: Face ID button present
      mockUseAuthStore.mockReturnValue(
        makeAuthState({ biometricsEnabled: true, loginWithBiometrics: loginWithBiometricsMock })
      );
      rerender(<LoginScreen />);
      const faceIdBtn = queryByTestId('login-face-id-button');
      expect(faceIdBtn).toBeTruthy();

      fireEvent.press(faceIdBtn!);
      await waitFor(() => {
        expect(loginWithBiometricsMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});

describe('ForgotPasswordScreen', () => {
  describe('handleSubmit', () => {
    it('posts /auth/forgot-password and shows generic success', async () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);

      fireEvent.changeText(getByTestId('forgot-password-email-input'), 'user@example.com');
      fireEvent.press(getByTestId('forgot-password-submit-button'));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/forgot-password', {
          email: 'user@example.com',
        });
        expect(getByTestId('forgot-password-success-message')).toBeTruthy();
      });
    });
  });
});

describe('ResetPasswordScreen', () => {
  describe('handleSubmit', () => {
    it('posts new password with token and navigates on success', async () => {
      const { getByTestId } = render(<ResetPasswordScreen />);

      fireEvent.changeText(getByTestId('reset-password-new-password-input'), 'newpass123');
      fireEvent.changeText(getByTestId('reset-password-confirm-password-input'), 'newpass123');
      fireEvent.press(getByTestId('reset-password-submit-button'));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'test-token-abc',
          newPassword: 'newpass123',
        });
        expect(mockNavigateFn).toHaveBeenCalledWith('Login');
      });
    });
  });
});
