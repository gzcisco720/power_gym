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

vi.mock('@/stores/scheduleStore', () => ({
  useScheduleStore: vi.fn(),
}));

vi.mock('@/stores/usersStore', () => ({
  useUsersStore: vi.fn(),
}));

import { useScheduleStore } from '@/stores/scheduleStore';
import { useUsersStore } from '@/stores/usersStore';
import { OwnerCalendarPage } from '@/pages/owner/calendar';

const baseScheduleStore = {
  sessions: [],
  isLoading: false,
  error: null,
  fetchSchedule: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
};

const baseUsersStore = {
  members: [],
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
      <OwnerCalendarPage />
    </MemoryRouter>,
  );
}

describe('OwnerCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScheduleStore).mockReturnValue(baseScheduleStore);
    vi.mocked(useUsersStore).mockReturnValue(baseUsersStore);
  });

  describe('render', () => {
    it('renders 7 day columns for the current week', () => {
      renderPage();
      // The week grid should render 7 columns with day labels (Mon-Sun)
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (const day of dayLabels) {
        expect(screen.getByText(day)).toBeInTheDocument();
      }
    });
  });
});
