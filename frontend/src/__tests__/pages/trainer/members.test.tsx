import { render, screen, act, fireEvent } from '@testing-library/react';
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
    useReducedMotion: () => false,
  };
});

vi.mock('@/stores/usersStore', () => ({
  useUsersStore: vi.fn(),
}));

import { useUsersStore } from '@/stores/usersStore';
import { TrainerMembersPage } from '@/pages/trainer/members';

const mockFetchMembers = vi.fn();

const sampleMembers = [
  { _id: 'm-1', name: 'Alice Smith', email: 'alice@test.com' },
  { _id: 'm-2', name: 'Bob Jones', email: 'bob@test.com' },
  { _id: 'm-3', name: 'Charlie Brown', email: 'charlie@test.com' },
];

function renderMembersPage() {
  return render(
    <MemoryRouter>
      <TrainerMembersPage />
    </MemoryRouter>,
  );
}

describe('TrainerMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMembers.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('search', () => {
    it('filters rendered cards by query after debounce', () => {
      vi.mocked(useUsersStore).mockReturnValue({
        members: sampleMembers,
        isLoading: false,
        error: null,
        fetchMembers: mockFetchMembers,
        trainers: [],
        invites: [],
        ownerStats: null,
        fetchOwnerMembers: vi.fn(),
        fetchTrainers: vi.fn(),
        fetchOwnerInvites: vi.fn(),
        createInvite: vi.fn(),
        assignTrainer: vi.fn(),
        fetchOwnerStats: vi.fn(),
        reset: vi.fn(),
      } as ReturnType<typeof useUsersStore>);

      renderMembersPage();

      // All three members visible initially
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

      // Type search query via fireEvent (avoids async userEvent + fake timers conflict)
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      // Advance debounce timer (350ms > 300ms)
      act(() => { vi.advanceTimersByTime(350); });

      // Only Alice should remain
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
    });
  });
});
