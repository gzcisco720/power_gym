import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreestylePathCard } from '@/components/self-tracking/freestyle-path-card';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('FreestylePathCard', () => {
  it('renders Full state with last freestyle echo + frequency', () => {
    render(
      <FreestylePathCard
        state="full"
        lastFreestyle={{
          dateLabel: 'Tue',
          durationMin: 45,
          rpe: 7,
          topSets: [
            { exerciseName: 'Squat', weight: 100, reps: 6, isPR: true },
            { exerciseName: 'Bench', weight: 95, reps: 5, isPR: false },
          ],
          remainingSets: 4,
        }}
        weeklyFrequency={2}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByText(/your last freestyle/i)).toBeInTheDocument();
    expect(screen.getByText(/100 kg × 6/)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ week/)).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('renders Light state without frequency and without PR badge', () => {
    render(
      <FreestylePathCard
        state="light"
        lastFreestyle={{
          dateLabel: 'Sat',
          durationMin: 32,
          rpe: 6,
          topSets: [{ exerciseName: 'Bench', weight: 85, reps: 5, isPR: false }],
          remainingSets: 0,
        }}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.queryByText(/per week/i)).not.toBeInTheDocument();
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('renders Empty state with what-you-can-do bullets', () => {
    render(<FreestylePathCard state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/pick exercises on the fly/i)).toBeInTheDocument();
    expect(screen.getByText(/save as a template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start blank/i })).toBeInTheDocument();
  });

  it('Start blank posts to /api/me/workout-logs and routes to the session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'log123' }) });
    render(<FreestylePathCard state="empty" basePath="/trainer/my-training" />);
    fireEvent.click(screen.getByRole('button', { name: /start blank/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/workout-logs',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/log123'));
  });
});
