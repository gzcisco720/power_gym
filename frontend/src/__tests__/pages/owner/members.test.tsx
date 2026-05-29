import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useUsersStore } from '@/stores/usersStore';
import { toast } from 'sonner';
import { OwnerMembersPage } from '@/pages/owner/members';

const mockAssignTrainer = vi.fn();

describe('OwnerMembersPage', () => {
  describe('assignTrainer', () => {
    it('calling assign selects a trainer and shows success toast', async () => {
      mockAssignTrainer.mockResolvedValueOnce(undefined);

      vi.mocked(useUsersStore).mockReturnValue({
        members: [
          {
            _id: 'm1',
            id: 'm1',
            name: 'Alice Member',
            email: 'alice@member.com',
            role: 'member',
            trainerId: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        trainers: [
          { _id: 't1', id: 't1', name: 'Bob Trainer', email: 'bob@trainer.com', role: 'trainer', createdAt: '2026-01-01T00:00:00Z' },
        ],
        ownerStats: null,
        invites: [],
        isLoading: false,
        error: null,
        fetchOwnerMembers: vi.fn(),
        fetchTrainers: vi.fn(),
        fetchOwnerStats: vi.fn(),
        fetchMembers: vi.fn(),
        fetchOwnerInvites: vi.fn(),
        createInvite: vi.fn(),
        assignTrainer: mockAssignTrainer,
        reset: vi.fn(),
      });

      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <OwnerMembersPage />
        </MemoryRouter>,
      );

      // Click the Reassign button for Alice
      const reassignBtn = screen.getByRole('button', { name: /reassign/i });
      await user.click(reassignBtn);

      // After clicking Reassign, inline trainer select + Confirm button appear
      const trainerSelect = screen.getByRole('combobox');
      await user.selectOptions(trainerSelect, 't1');

      // Now click Confirm to trigger the assignment
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockAssignTrainer).toHaveBeenCalledWith('m1', 't1');
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
