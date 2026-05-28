import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompleteWorkoutDialog } from '@/components/self-tracking/complete-workout-dialog';

// Skip the animation phase so tests interact with the form directly
jest.mock('@/components/animations/workout-complete', () => ({
  WorkoutCompleteAnimation: ({ onComplete }: { onComplete?: () => void }) => {
    onComplete?.();
    return null;
  },
}));

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

  it('disables Finish workout when save-as-template is checked but name is empty', async () => {
    render(
      <CompleteWorkoutDialog
        open={true}
        onOpenChange={() => undefined}
        logId="log1"
        onCompleted={() => undefined}
      />,
    );
    // Toggle the save-as-template checkbox on
    fireEvent.click(screen.getByRole('checkbox'));
    const submitBtn = screen.getByRole('button', { name: /finish workout/i });
    expect(submitBtn).toBeDisabled();
    // Fill the name to enable
    fireEvent.change(screen.getByLabelText(/template name/i), { target: { value: 'My Push' } });
    expect(submitBtn).not.toBeDisabled();
  });
});
