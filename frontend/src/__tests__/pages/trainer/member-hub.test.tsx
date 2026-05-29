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
    useReducedMotion: () => false,
  };
});

vi.mock('@/stores/usersStore', () => ({
  useUsersStore: vi.fn(),
}));

import { useUsersStore } from '@/stores/usersStore';
import { TrainerMemberHubPage } from '@/pages/trainer/member-hub';

function renderHubPage(memberId = 'member-1') {
  return render(
    <MemoryRouter initialEntries={[`/trainer/members/${memberId}`]}>
      <Routes>
        <Route path="/trainer/members/:id" element={<TrainerMemberHubPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainerMemberHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUsersStore).mockReturnValue({
      members: [{ _id: 'member-1', name: 'Alice Smith', email: 'alice@test.com' }],
      isLoading: false,
      error: null,
      fetchMembers: vi.fn(),
      fetchOwnerMembers: vi.fn(),
      trainers: [],
      invites: [],
      ownerStats: null,
      fetchTrainers: vi.fn(),
      fetchOwnerInvites: vi.fn(),
      createInvite: vi.fn(),
      assignTrainer: vi.fn(),
      fetchOwnerStats: vi.fn(),
      reset: vi.fn(),
    } as ReturnType<typeof useUsersStore>);
  });

  describe('renders', () => {
    it('shows all member tab labels (Plan, Nutrition, Body Tests, Health, Check-ins, Billing)', () => {
      renderHubPage();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Nutrition')).toBeInTheDocument();
      expect(screen.getByText('Body Tests')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Check-ins')).toBeInTheDocument();
      expect(screen.getByText('Billing')).toBeInTheDocument();
    });
  });
});
