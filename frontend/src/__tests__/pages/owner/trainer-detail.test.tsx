import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
import { OwnerTrainerDetailPage } from '@/pages/owner/trainer-detail';

function renderWithRoute(trainerId: string) {
  return render(
    <MemoryRouter initialEntries={[`/owner/trainers/${trainerId}`]}>
      <Routes>
        <Route path="/owner/trainers/:id" element={<OwnerTrainerDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OwnerTrainerDetailPage', () => {
  describe('empty', () => {
    it('renders EmptyState heading when trainer has no members', () => {
      vi.mocked(useUsersStore).mockReturnValue({
        trainers: [
          { _id: 't1', id: 't1', name: 'Alice Smith', email: 'alice@test.com', role: 'trainer', createdAt: '2026-01-01T00:00:00Z' },
        ],
        members: [], // no members assigned to t1
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

      renderWithRoute('t1');

      // Should render the EmptyState component's heading element with specific class
      // EmptyState renders: <div className="... text-[15px] font-semibold text-foreground">heading</div>
      // Match the exact heading text (not the description)
      const heading = screen.getByText('No members assigned');
      expect(heading).toBeInTheDocument();
      // Must NOT be rendered as a plain <p> element — must be the EmptyState heading div
      expect(heading.tagName).not.toBe('P');
    });
  });
});
