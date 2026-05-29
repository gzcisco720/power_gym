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

vi.mock('@/stores/billingStore', () => ({
  useBillingStore: vi.fn(),
}));

import { useUsersStore } from '@/stores/usersStore';
import { useBillingStore } from '@/stores/billingStore';
import { OwnerBillingPage } from '@/pages/owner/billing';

const mockFetchMemberBilling = vi.fn();

const baseBillingStore = {
  serviceTypes: [],
  billingLines: [],
  isLoading: false,
  error: null,
  fetchServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  deleteServiceType: vi.fn(),
  fetchMemberBilling: mockFetchMemberBilling,
};

const baseUsersStore = {
  members: [
    { _id: 'mem-1', name: 'Alice', email: 'alice@test.com', role: 'member' as const, trainerId: 'tr-1' },
  ],
  trainers: [],
  invites: [],
  ownerStats: null,
  isLoading: false,
  error: null,
  fetchOwnerMembers: vi.fn(),
  fetchMembers: vi.fn(),
  fetchTrainers: vi.fn(),
  fetchOwnerInvites: vi.fn(),
  createInvite: vi.fn(),
  assignTrainer: vi.fn(),
  fetchOwnerStats: vi.fn(),
  reset: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerBillingPage />
    </MemoryRouter>,
  );
}

describe('OwnerBillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchMemberBilling.mockResolvedValue(undefined);
    vi.mocked(useUsersStore).mockReturnValue(baseUsersStore);
    vi.mocked(useBillingStore).mockReturnValue(baseBillingStore);
  });

  describe('selectMember', () => {
    it('fetchMemberBilling called when a member is selected', async () => {
      const user = userEvent.setup();
      renderPage();

      const memberButton = screen.getByRole('button', { name: /alice/i });
      await user.click(memberButton);

      expect(mockFetchMemberBilling).toHaveBeenCalledWith('mem-1');
    });
  });
});
