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
    useReducedMotion: () => false,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/bodyTestsStore', () => ({
  useBodyTestsStore: vi.fn(),
}));

import { useAuthStore } from '@/stores/authStore';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { MemberBodyTestsPage } from '@/pages/member/body-tests';

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberBodyTestsPage />
    </MemoryRouter>,
  );
}

describe('MemberBodyTestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      status: 'authenticated',
      accessToken: 'tok',
      user: { id: 'member-1', email: 'member@test.com', role: 'member', name: 'Alice' },
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      initAuth: vi.fn(),
    } as ReturnType<typeof useAuthStore>);
  });

  describe('empty', () => {
    it('renders EmptyState when no tests', () => {
      vi.mocked(useBodyTestsStore).mockReturnValue({
        testsByMember: {},
        isLoading: false,
        error: null,
        fetchTests: vi.fn(),
        createTest: vi.fn(),
        deleteTest: vi.fn(),
        exportCsv: vi.fn(),
      } as ReturnType<typeof useBodyTestsStore>);

      renderPage();

      expect(screen.getByText(/no tests recorded/i)).toBeInTheDocument();
    });
  });
});
