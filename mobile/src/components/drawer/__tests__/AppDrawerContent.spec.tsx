import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppDrawerContent } from '../AppDrawerContent';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

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

const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: (selector?: (s: {
    user: { id: string; firstName: string; lastName: string; role: 'owner' | 'trainer' | 'member'; trainerId: string | null };
    accessToken: string;
    logout: () => Promise<void>;
  }) => unknown) => {
    const state = {
      user: {
        id: 'u1',
        firstName: 'Alice',
        lastName: 'Owner',
        role: 'owner' as const,
        trainerId: null,
      },
      accessToken: 'tok',
      logout: mockLogout,
    };
    return selector ? selector(state) : state;
  },
}));

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

const renderDrawer = () =>
  render(
    <AppDrawerContent
      navigation={mockNavigation as Parameters<typeof AppDrawerContent>[0]['navigation']}
      descriptors={{}}
      state={mockState}
    />,
  );

describe('AppDrawerContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Owner nav groups when auth role is owner (e.g. a "TEMPLATES" group label is visible)', () => {
    const { getByText } = renderDrawer();
    expect(getByText('TEMPLATES')).toBeTruthy();
  });

  it('renders gym name from the branding store in the branding header', () => {
    const { getAllByText } = renderDrawer();
    const matches = getAllByText('Iron Gym');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('tapping the user footer opens the user menu', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId('drawer-user-footer'));
    expect(getByTestId('drawer-menu-settings')).toBeTruthy();
    expect(getByTestId('drawer-menu-logout')).toBeTruthy();
  });

  it('tapping Settings in the menu navigates to Settings', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId('drawer-user-footer'));
    fireEvent.press(getByTestId('drawer-menu-settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });

  it('tapping Log Out in the menu calls logout', () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId('drawer-user-footer'));
    fireEvent.press(getByTestId('drawer-menu-logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('does not show the gear icon', () => {
    const { queryByText } = renderDrawer();
    expect(queryByText('⚙')).toBeNull();
  });

  it('navigates on item press — pressing a drawer item triggers the existing navigation call', () => {
    const { getByTestId } = renderDrawer();
    // For owner role, the first nav group item should be Dashboard
    fireEvent.press(getByTestId('drawer-item-Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('Dashboard');
  });
});
