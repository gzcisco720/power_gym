import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('@/stores/memberHealthStore', () => ({
  useMemberHealthStore: vi.fn(),
}));

import { useMemberHealthStore } from '@/stores/memberHealthStore';
import { TrainerMemberHealthPage } from '@/pages/trainer/member-health';

const mockAddInjury = vi.fn();
const mockFetchHealth = vi.fn();

function renderHealthPage(memberId = 'member-1') {
  return render(
    <MemoryRouter initialEntries={[`/trainer/members/${memberId}/health`]}>
      <Routes>
        <Route path="/trainer/members/:id/health" element={<TrainerMemberHealthPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainerMemberHealthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddInjury.mockResolvedValue(undefined);
    mockFetchHealth.mockResolvedValue(undefined);

    vi.mocked(useMemberHealthStore).mockReturnValue({
      injuriesByMember: {},
      medicalHistoryByMember: {},
      medicationsByMember: {},
      isLoading: false,
      error: null,
      fetchHealth: mockFetchHealth,
      addInjury: mockAddInjury,
      deleteInjury: vi.fn(),
    } as ReturnType<typeof useMemberHealthStore>);
  });

  describe('addInjury', () => {
    it('addInjury called with title and bodyPart', async () => {
      renderHealthPage('member-1');

      fireEvent.click(screen.getByRole('button', { name: /add injury/i }));

      await screen.findByRole('dialog');

      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Left knee sprain' } });
      fireEvent.change(screen.getByLabelText(/body part/i), { target: { value: 'knee' } });

      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(mockAddInjury).toHaveBeenCalledWith('member-1', expect.objectContaining({
          title: 'Left knee sprain',
          bodyPart: 'knee',
        }));
      });
    });
  });
});
