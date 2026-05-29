import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('@/stores/checkInsStore', () => ({
  useCheckInsStore: vi.fn(),
}));

import { useCheckInsStore } from '@/stores/checkInsStore';
import { MemberCheckInNewPage } from '@/pages/member/check-in-new';

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberCheckInNewPage />
    </MemoryRouter>,
  );
}

function mockStore(overrides: { submitCheckIn?: ReturnType<typeof vi.fn>; error?: string | null } = {}) {
  vi.mocked(useCheckInsStore).mockReturnValue({
    checkIns: [],
    config: null,
    isLoading: false,
    error: overrides.error ?? null,
    fetchCheckIns: vi.fn(),
    fetchConfig: vi.fn(),
    submitCheckIn: overrides.submitCheckIn ?? vi.fn(),
  } as ReturnType<typeof useCheckInsStore>);
}

describe('MemberCheckInNewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submit', () => {
    it('submitCheckIn called with all metric values and shows success state', async () => {
      const mockSubmitCheckIn = vi.fn().mockResolvedValue(undefined);
      mockStore({ submitCheckIn: mockSubmitCheckIn });

      renderPage();

      const submitBtn = screen.getByRole('button', { name: /submit check-in/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitCheckIn).toHaveBeenCalledWith(
          expect.objectContaining({
            sleepQuality: expect.any(Number),
            stress: expect.any(Number),
            fatigue: expect.any(Number),
            hunger: expect.any(Number),
            recovery: expect.any(Number),
            energy: expect.any(Number),
            digestion: expect.any(Number),
            stuckToDiet: expect.stringMatching(/^(yes|no|partial)$/),
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/check-in submitted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('submit blocked when a required metric is missing', async () => {
      const mockSubmitCheckIn = vi.fn();
      mockStore({ submitCheckIn: mockSubmitCheckIn });

      renderPage();

      // Clear the sleep quality text input to an invalid value (empty / 0)
      // The implementation must expose a numeric input with data-metric="sleepQuality" or similar
      // to allow clearing. We simulate clearing via the numeric field.
      const sleepInput = screen.getByLabelText(/sleep quality/i);
      fireEvent.change(sleepInput, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /submit check-in/i });
      fireEvent.click(submitBtn);

      // Inline error should appear and submitCheckIn should NOT be called
      await waitFor(() => {
        expect(screen.getByText(/required|missing|enter a value/i)).toBeInTheDocument();
      });

      expect(mockSubmitCheckIn).not.toHaveBeenCalled();
    });
  });
});
