/**
 * Stage 4 unit tests — Placeholder screens
 * Uses React Native Testing Library (RNTL)
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('react-native-svg');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../stores/branding.store', () => ({
  useBrandingStore: (
    selector?: (s: { gymName: string | null; logoUrl: string | null; fetchBranding: () => void }) => unknown,
  ) => {
    const state = { gymName: 'Power Gym', logoUrl: null, fetchBranding: jest.fn() };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn().mockReturnValue({
    accessToken: 'token',
    user: { firstName: 'John', lastName: 'Doe', role: 'member' },
    biometricsEnabled: false,
    setBiometricsEnabled: jest.fn(),
  }),
}));

const mockNavigation = {
  toggleDrawer: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }: { children: unknown }) => children,
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { DashboardScreen } from '../DashboardScreen';
import {
  EquipmentScreen,
  JourneyScreen,
  makePlaceholder,
} from '../placeholders';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('placeholders', () => {
  describe('Dashboard screen', () => {
    it('renders testID "home-screen" and the role-based branch for biometrics E2E compatibility', () => {
      const { getByTestId } = render(<DashboardScreen />);
      expect(getByTestId('home-screen')).toBeTruthy();
      // Auth mock sets role: 'member', so the member-dashboard branch is rendered
      expect(getByTestId('member-dashboard')).toBeTruthy();
    });
  });

  describe('Equipment screen', () => {
    it('renders a header and the "Equipment" title', () => {
      const { getByText } = render(<EquipmentScreen />);
      expect(getByText('Equipment')).toBeTruthy();
    });
  });

  describe('Journey screen (member)', () => {
    it('renders the "Journey" title', () => {
      const { getByText } = render(<JourneyScreen />);
      expect(getByText('Journey')).toBeTruthy();
    });
  });

  describe('makePlaceholder', () => {
    it('produces a component rendering its title', () => {
      const TestScreen = makePlaceholder('Test Screen', 'screen-Test');
      const { getByTestId, getByText } = render(<TestScreen />);
      expect(getByTestId('screen-Test')).toBeTruthy();
      expect(getByText('Test Screen')).toBeTruthy();
    });
  });
});
