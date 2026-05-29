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

// Mock recharts to avoid canvas/SVG complexities in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`chart-line-${dataKey}`} />
  ),
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/progressStore', () => ({
  useProgressStore: vi.fn(),
}));

import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import { MemberJourneyPage } from '@/pages/member/journey';

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberJourneyPage />
    </MemoryRouter>,
  );
}

describe('MemberJourneyPage', () => {
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

  describe('data', () => {
    it('renders a chart line per distinct exercise in trend data', () => {
      vi.mocked(useProgressStore).mockReturnValue({
        trend: {
          'member-1': [
            { exerciseName: 'Squat', estimatedOneRM: 100, achievedAt: '2025-01-01' },
            { exerciseName: 'Bench Press', estimatedOneRM: 80, achievedAt: '2025-01-01' },
            { exerciseName: 'Squat', estimatedOneRM: 110, achievedAt: '2025-01-15' },
          ],
        },
        isLoading: false,
        error: null,
        fetchTrend: vi.fn(),
      } as ReturnType<typeof useProgressStore>);

      renderPage();

      // One Line per distinct exercise name
      expect(screen.getByTestId('chart-line-Squat')).toBeInTheDocument();
      expect(screen.getByTestId('chart-line-Bench Press')).toBeInTheDocument();
    });
  });
});
