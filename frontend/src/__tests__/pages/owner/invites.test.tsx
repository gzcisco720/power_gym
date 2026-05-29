import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock @base-ui-components/react/dialog for testing — it often needs a portal
vi.mock('@base-ui-react/dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@base-ui-react/dialog')>();
  return {
    ...actual,
    Dialog: {
      ...actual.Dialog,
      Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
  };
});

import { useUsersStore } from '@/stores/usersStore';
import { OwnerInvitesPage } from '@/pages/owner/invites';

const mockCreateInvite = vi.fn();

describe('OwnerInvitesPage', () => {
  describe('submit', () => {
    it('createInvite called with form values and dialog closes on success', async () => {
      mockCreateInvite.mockResolvedValueOnce('tok-abc');

      vi.mocked(useUsersStore).mockReturnValue({
        invites: [],
        trainers: [
          { _id: 't1', id: 't1', name: 'Bob Trainer', email: 'bob@trainer.com', role: 'trainer', createdAt: '2026-01-01T00:00:00Z' },
        ],
        members: [],
        ownerStats: null,
        isLoading: false,
        error: null,
        fetchOwnerInvites: vi.fn(),
        fetchTrainers: vi.fn(),
        fetchOwnerStats: vi.fn(),
        fetchOwnerMembers: vi.fn(),
        fetchMembers: vi.fn(),
        createInvite: mockCreateInvite,
        assignTrainer: vi.fn(),
        reset: vi.fn(),
      });

      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <OwnerInvitesPage />
        </MemoryRouter>,
      );

      // Click the "Send Invite" / "Invite" button to open dialog
      const sendBtn = screen.getByRole('button', { name: /send invite|invite/i });
      await user.click(sendBtn);

      // Dialog should be open (Base UI dialog uses data-open attribute)
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fill in the email field
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.type(emailInput, 'new@example.com');

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /generate invite|send/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith(
          expect.objectContaining({ recipientEmail: 'new@example.com' }),
        );
      });

      // Dialog should close after success
      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
      });
    });
  });
});
