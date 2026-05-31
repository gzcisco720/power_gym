import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppDrawerContent } from '../AppDrawerContent';

// Mock the branding store
jest.mock('../../../stores/branding.store', () => ({
  useBrandingStore: (selector?: (s: { gymName: string | null; logoUrl: string | null; fetchBranding: () => void }) => unknown) => {
    const state = {
      gymName: 'Iron Gym',
      logoUrl: null,
      fetchBranding: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock the auth store — component calls useAuthStore((s) => s.user) with selector
jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: (selector?: (s: { user: { id: string; firstName: string; lastName: string; role: 'owner' | 'trainer' | 'member'; trainerId: string | null }; accessToken: string }) => unknown) => {
    const state = {
      user: {
        id: 'u1',
        firstName: 'Alice',
        lastName: 'Owner',
        role: 'owner' as const,
        trainerId: null,
      },
      accessToken: 'tok',
    };
    return selector ? selector(state) : state;
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  closeDrawer: jest.fn(),
  toggleDrawer: jest.fn(),
};

jest.mock('@react-navigation/drawer', () => ({
  useDrawerStatus: () => 'closed',
  DrawerContentScrollView: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

type DrawerState = Parameters<typeof AppDrawerContent>[0]['state'];

const mockState = {
  routes: [],
  index: 0,
  key: '',
  type: 'drawer' as const,
  history: [],
  stale: false as const,
  routeNames: [],
  preloadedRouteKeys: [],
} as unknown as DrawerState;

describe('AppDrawerContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Owner nav groups when auth role is owner (e.g. a "TEMPLATES" group label is visible)', () => {
    const { getByText } = render(
      <AppDrawerContent
        navigation={mockNavigation as Parameters<typeof AppDrawerContent>[0]['navigation']}
        descriptors={{}}
        state={mockState}
      />,
    );
    expect(getByText('TEMPLATES')).toBeTruthy();
  });

  it('renders gym name from the branding store in the branding header', () => {
    const { getAllByText } = render(
      <AppDrawerContent
        navigation={mockNavigation as Parameters<typeof AppDrawerContent>[0]['navigation']}
        descriptors={{}}
        state={mockState}
      />,
    );
    // gym name appears in both branding header and drawer header
    const matches = getAllByText('Iron Gym');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('tapping the user footer calls navigation.navigate with "Settings"', () => {
    const { getByTestId } = render(
      <AppDrawerContent
        navigation={mockNavigation as Parameters<typeof AppDrawerContent>[0]['navigation']}
        descriptors={{}}
        state={mockState}
      />,
    );
    const footer = getByTestId('drawer-user-footer');
    fireEvent.press(footer);
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});
