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

import {
  DashboardScreen,
  EquipmentScreen,
  JourneyScreen,
  makePlaceholder,
} from '../placeholders';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('placeholders', () => {
  describe('Dashboard screen', () => {
    it('renders its page title and keeps testID "home-screen" for biometrics E2E compatibility', () => {
      const { getByTestId, getByText } = render(<DashboardScreen />);
      expect(getByTestId('home-screen')).toBeTruthy();
      expect(getByText('Dashboard')).toBeTruthy();
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
    it('produces a component rendering the standard DrawerHeader (hamburger present)', () => {
      const TestScreen = makePlaceholder('Test Screen', 'screen-Test');
      const { getByTestId } = render(<TestScreen />);
      // DrawerHeader renders the hamburger button
      expect(getByTestId('drawer-hamburger')).toBeTruthy();
    });
  });
});
