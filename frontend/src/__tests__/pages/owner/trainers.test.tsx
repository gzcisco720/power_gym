import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

vi.mock('@/stores/usersStore', () => ({
  useUsersStore: vi.fn(),
}));

import { useUsersStore } from '@/stores/usersStore';
import { OwnerTrainersPage } from '@/pages/owner/trainers';

describe('OwnerTrainersPage', () => {
  describe('loaded', () => {
    it('renders one trainer card per trainer with its member count', () => {
      vi.mocked(useUsersStore).mockReturnValue({
        trainers: [
          { _id: 't1', id: 't1', name: 'Alice Smith', email: 'alice@test.com', role: 'trainer', createdAt: '2026-01-01T00:00:00Z' },
          { _id: 't2', id: 't2', name: 'Bob Jones', email: 'bob@test.com', role: 'trainer', createdAt: '2026-01-01T00:00:00Z' },
        ],
        members: [
          { _id: 'm1', id: 'm1', name: 'Member One', email: 'm1@test.com', role: 'member', trainerId: 't1', createdAt: '2026-01-01T00:00:00Z' },
          { _id: 'm2', id: 'm2', name: 'Member Two', email: 'm2@test.com', role: 'member', trainerId: 't1', createdAt: '2026-01-01T00:00:00Z' },
          { _id: 'm3', id: 'm3', name: 'Member Three', email: 'm3@test.com', role: 'member', trainerId: 't2', createdAt: '2026-01-01T00:00:00Z' },
        ],
        ownerStats: null,
        invites: [],
        isLoading: false,
        error: null,
        fetchTrainers: vi.fn(),
        fetchOwnerMembers: vi.fn(),
        fetchOwnerStats: vi.fn(),
        fetchMembers: vi.fn(),
        fetchOwnerInvites: vi.fn(),
        createInvite: vi.fn(),
        assignTrainer: vi.fn(),
        reset: vi.fn(),
      });

      render(
        <MemoryRouter>
          <OwnerTrainersPage />
        </MemoryRouter>,
      );

      // Both trainer names visible
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();

      // Member counts visible (alice has 2, bob has 1)
      // Use getAllByText since "2" may appear multiple times (stat card + member count)
      const twos = screen.getAllByText(/^2$/);
      expect(twos.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/^1$/).length).toBeGreaterThanOrEqual(1);

      // View Hub links exist
      const viewHubLinks = screen.getAllByRole('link', { name: /view hub/i });
      expect(viewHubLinks).toHaveLength(2);
    });
  });
});
