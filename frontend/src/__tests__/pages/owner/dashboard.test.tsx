import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    m: {
      ...actual.m,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
    },
    LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock the stores
vi.mock('@/stores/usersStore', () => ({
  useUsersStore: vi.fn(),
}));

vi.mock('@/stores/equipmentStore', () => ({
  useEquipmentStore: vi.fn(),
}));

import { useUsersStore } from '@/stores/usersStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { OwnerDashboardPage } from '@/pages/owner/dashboard';

const mockFetchOwnerStats = vi.fn();
const mockFetchEquipment = vi.fn();

beforeEach(() => {
  vi.mocked(useEquipmentStore).mockReturnValue({
    equipment: [],
    conditionReports: {},
    isLoading: false,
    error: null,
    fetchEquipment: mockFetchEquipment,
    createEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    fetchConditionReports: vi.fn(),
    addConditionReport: vi.fn(),
  });
});

describe('OwnerDashboardPage', () => {
  describe('loading', () => {
    it('renders stat-card skeletons while usersStore.isLoading is true', () => {
      vi.mocked(useUsersStore).mockReturnValue({
        ownerStats: null,
        trainers: [],
        members: [],
        invites: [],
        isLoading: true,
        error: null,
        fetchOwnerStats: mockFetchOwnerStats,
        fetchOwnerMembers: vi.fn(),
        fetchMembers: vi.fn(),
        fetchTrainers: vi.fn(),
        fetchOwnerInvites: vi.fn(),
        createInvite: vi.fn(),
        assignTrainer: vi.fn(),
        reset: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter>
          <OwnerDashboardPage />
        </MemoryRouter>,
      );

      // Should show skeleton elements (no stat value digits rendered for real data)
      const skeletons = container.querySelectorAll('[data-slot="skeleton"], .animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
      // memberCount value should not be rendered
      expect(screen.queryByText('42')).not.toBeInTheDocument();
    });
  });

  describe('loaded', () => {
    it('renders a StatCard for memberCount and trainerCount from ownerStats', () => {
      vi.mocked(useUsersStore).mockReturnValue({
        ownerStats: {
          memberCount: 42,
          trainerCount: 7,
          pendingInviteCount: 3,
          membersByMonth: [{ label: 'Jan', newCount: 5 }],
        },
        trainers: [],
        members: [],
        invites: [],
        isLoading: false,
        error: null,
        fetchOwnerStats: mockFetchOwnerStats,
        fetchOwnerMembers: vi.fn(),
        fetchMembers: vi.fn(),
        fetchTrainers: vi.fn(),
        fetchOwnerInvites: vi.fn(),
        createInvite: vi.fn(),
        assignTrainer: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <MemoryRouter>
          <OwnerDashboardPage />
        </MemoryRouter>,
      );

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});
