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

// Base UI Select doesn't render properly in JSDOM — mock it as a native select
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, 'aria-label': ariaLabel }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; 'aria-label'?: string }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} aria-label={ariaLabel ?? 'Select trainer'}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
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
const mockFetchOwnerMembers = vi.fn();
const mockUnassignTrainer = vi.fn();

const mockStoreBase = () => ({
  members: [
    {
      _id: 'm1',
      id: 'm1',
      name: 'Alice Member',
      email: 'alice@member.com',
      role: 'member' as const,
      trainerId: 't1',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      _id: 'm2',
      id: 'm2',
      name: 'Bob Member',
      email: 'bob@member.com',
      role: 'member' as const,
      trainerId: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  trainers: [
    { _id: 't1', id: 't1', name: 'Bob Trainer', email: 'bob@trainer.com', role: 'trainer' as const, createdAt: '2026-01-01T00:00:00Z' },
  ],
  ownerStats: null,
  invites: [],
  isLoading: false,
  error: null,
  fetchOwnerMembers: mockFetchOwnerMembers,
  fetchTrainers: vi.fn(),
  fetchOwnerStats: vi.fn(),
  fetchMembers: vi.fn(),
  fetchOwnerInvites: vi.fn(),
  createInvite: vi.fn(),
  assignTrainer: mockAssignTrainer,
  unassignTrainer: mockUnassignTrainer,
  reset: vi.fn(),
});

describe('OwnerMembersPage', () => {
  describe('trainer filter', () => {
    it('selecting a trainer in the dropdown re-fetches members with that trainerId', async () => {
      vi.mocked(useUsersStore).mockReturnValue(mockStoreBase());

      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <OwnerMembersPage />
        </MemoryRouter>,
      );

      // Open the Trainer filter combobox and select Bob Trainer
      const filterSelect = screen.getByRole('combobox', { name: /filter by trainer/i });
      await user.selectOptions(filterSelect, 't1');

      expect(mockFetchOwnerMembers).toHaveBeenCalledWith('t1');
    });

    it('selecting "All Trainers" re-fetches with no trainerId', async () => {
      vi.mocked(useUsersStore).mockReturnValue(mockStoreBase());

      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <OwnerMembersPage />
        </MemoryRouter>,
      );

      // Select a trainer first, then clear it
      const filterSelect = screen.getByRole('combobox', { name: /filter by trainer/i });
      await user.selectOptions(filterSelect, 't1');
      await user.selectOptions(filterSelect, '');

      expect(mockFetchOwnerMembers).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('assignTrainer', () => {
    it('calling assign selects a trainer and shows success toast', async () => {
      mockAssignTrainer.mockResolvedValueOnce(undefined);

      vi.mocked(useUsersStore).mockReturnValue({
        ...mockStoreBase(),
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
        assignTrainer: mockAssignTrainer,
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
      const trainerSelect = screen.getByRole('combobox', { name: /select trainer/i });
      await user.selectOptions(trainerSelect, 't1');

      // Now click Confirm to trigger the assignment
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmBtn);

      expect(mockAssignTrainer).toHaveBeenCalledWith('m1', 't1');
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
