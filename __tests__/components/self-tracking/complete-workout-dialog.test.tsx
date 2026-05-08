import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompleteWorkoutDialog } from '@/components/self-tracking/complete-workout-dialog';

describe('CompleteWorkoutDialog', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ _id: 'log1' }),
    });
  });

  it('submits with empty rpe + note when Finish workout clicked', async () => {
    const onCompleted = jest.fn();
    render(
      <CompleteWorkoutDialog
        open={true}
        onOpenChange={() => undefined}
        logId="log1"
        onCompleted={onCompleted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /finish workout/i }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/me/workout-logs/log1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
