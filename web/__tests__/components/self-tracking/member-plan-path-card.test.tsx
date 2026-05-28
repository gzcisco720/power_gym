import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemberPlanPathCard } from '@/components/self-tracking/member-plan-path-card';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/components/self-tracking/active-session-conflict-dialog', () => ({
  ActiveSessionConflictDialog: ({
    open,
    dayName,
    onClose,
    onDeleteAndStart,
  }: {
    open: boolean;
    dayName: string;
    setCount: number;
    resumeHref: string;
    onClose: () => void;
    onDeleteAndStart: () => void;
  }) =>
    open ? (
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role
      <div role="dialog" data-testid="conflict-dialog">
        <span>Active: {dayName}</span>
        <button onClick={onDeleteAndStart}>Delete and Start</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));
jest.mock('@/components/self-tracking/day-already-logged-dialog', () => ({
  DayAlreadyLoggedDialog: ({
    open,
    dayName,
    onClose,
  }: {
    open: boolean;
    dayName: string;
    sessionId: string;
    basePath: string;
    onClose: () => void;
  }) =>
    open ? (
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role
      <div role="dialog" data-testid="already-logged-dialog">
        <span>Already logged: {dayName}</span>
        <button onClick={onClose}>Got it</button>
      </div>
    ) : null,
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const plan = {
  _id: 'plan1',
  templateId: 'tpl1',
  name: 'Push Pull Legs',
  days: [
    {
      dayNumber: 1,
      name: 'Day 1 · Push',
      exercises: [
        {
          groupId: 'g1',
          isSuperset: false,
          exerciseId: 'ex1',
          exerciseName: 'Bench Press',
          isBodyweight: false,
          sets: 3,
          repsMin: 6,
          repsMax: 8,
        },
      ],
    },
    { dayNumber: 2, name: 'Day 2 · Pull', exercises: [] },
    { dayNumber: 3, name: 'Day 3 · Legs', exercises: [] },
  ],
};

describe('MemberPlanPathCard', () => {
  describe('empty state (no plan)', () => {
    it('renders no-plan message when plan is null', () => {
      render(<MemberPlanPathCard plan={null} basePath="/member/my-training" />);
      expect(screen.getByText(/no training plan assigned/i)).toBeInTheDocument();
      expect(screen.getByText(/ask your trainer/i)).toBeInTheDocument();
    });

    it('does not render any Log button when plan is null', () => {
      render(<MemberPlanPathCard plan={null} basePath="/member/my-training" />);
      expect(screen.queryByRole('button', { name: /log/i })).not.toBeInTheDocument();
    });
  });

  describe('with plan', () => {
    it('renders plan name and all day names', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
      expect(screen.getByText('Day 1 · Push')).toBeInTheDocument();
      expect(screen.getByText('Day 2 · Pull')).toBeInTheDocument();
      expect(screen.getByText('Day 3 · Legs')).toBeInTheDocument();
    });

    it('shows exercise preview for days that have exercises', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getByText(/bench press/i)).toBeInTheDocument();
    });

    it('renders a Log button for each day', () => {
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(3);
    });

    it('POSTs with correct payload and navigates to session on Log click', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'log42' }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      expect(body.dayName).toBe('Day 1 · Push');
      expect(body.sourceTemplateId).toBe('tpl1');
      expect(body.sourceTemplateDayNumber).toBe(1);
      expect(body.plannedSets).toHaveLength(3);
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/member/my-training/session/log42'),
      );
    });

    it('plannedSets have correct shape', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'logX' }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
      const set = body.plannedSets[0];
      expect(set.exerciseName).toBe('Bench Press');
      expect(set.setNumber).toBe(1);
      expect(set.prescribedRepsMin).toBe(6);
      expect(set.prescribedRepsMax).toBe(8);
      expect(set.actualWeight).toBeNull();
      expect(set.actualReps).toBeNull();
    });

    it('shows conflict dialog on 409 ACTIVE_SESSION_EXISTS', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'act1', dayName: 'Day 2 · Pull', setCount: 2 },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      expect(await screen.findByTestId('conflict-dialog')).toBeInTheDocument();
    });

    it('conflict Cancel clears dialog', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'act1', dayName: 'Day 2', setCount: 0 },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() =>
        expect(screen.queryByTestId('conflict-dialog')).not.toBeInTheDocument(),
      );
    });

    it('conflict "Delete and Start" re-POSTs with deleteActive=true', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'ACTIVE_SESSION_EXISTS',
            activeSession: { _id: 'act1', dayName: 'Day 2', setCount: 0 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: 'newLog' }),
        });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /delete and start/i }));
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/me/workout-logs?deleteActive=true',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/member/my-training/session/newLog'),
      );
    });

    it('shows already-logged dialog on 409 DAY_ALREADY_LOGGED', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'DAY_ALREADY_LOGGED',
          session: { _id: 'done1', dayName: 'Day 1 · Push' },
        }),
      });
      render(<MemberPlanPathCard plan={plan} basePath="/member/my-training" />);
      fireEvent.click(screen.getAllByRole('button', { name: /log/i })[0]);
      expect(await screen.findByTestId('already-logged-dialog')).toBeInTheDocument();
    });
  });
});
