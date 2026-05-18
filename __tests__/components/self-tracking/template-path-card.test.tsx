import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatePathCard } from '@/components/self-tracking/template-path-card';

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
      <div role="dialog" data-testid="conflict-dialog">
        <span>Active session: {dayName}</span>
        <button onClick={onDeleteAndStart}>Delete and Start</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const singleDayTemplate = {
  _id: 'tplA',
  name: 'My Strength A',
  days: [
    {
      dayNumber: 1,
      name: 'Upper',
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
  ],
};

const multiDayTemplate = {
  _id: 'tplB',
  name: 'My PPL',
  days: [
    { dayNumber: 1, name: 'Push', exercises: [] },
    { dayNumber: 2, name: 'Pull', exercises: [] },
    { dayNumber: 3, name: 'Legs', exercises: [] },
  ],
};

describe('TemplatePathCard', () => {
  describe('empty state (no templates)', () => {
    it('renders unified empty state with icon title and create button', () => {
      render(<TemplatePathCard templates={[]} basePath="/trainer/my-training" />);
      expect(screen.getByText('No templates yet.')).toBeInTheDocument();
      expect(screen.getByText(/create a training template/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ create template/i })).toBeInTheDocument();
    });

    it('Create Template button routes to plans/new', () => {
      render(<TemplatePathCard templates={[]} basePath="/owner/my-training" />);
      fireEvent.click(screen.getByRole('button', { name: /\+ create template/i }));
      expect(pushMock).toHaveBeenCalledWith('/owner/plans/new');
    });
  });

  describe('has templates', () => {
    it('renders template accordion with "Pick any day" label', () => {
      render(
        <TemplatePathCard
          templates={[singleDayTemplate, multiDayTemplate]}
          basePath="/trainer/my-training"
        />,
      );
      expect(screen.getByText(/pick any day/i)).toBeInTheDocument();
      expect(screen.getByText('My Strength A')).toBeInTheDocument();
      expect(screen.getByText('My PPL')).toBeInTheDocument();
    });

    it('auto-expands when only one template', () => {
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      // Day name should be visible because it's expanded
      expect(screen.getByText('Upper')).toBeInTheDocument();
    });

    it('does not auto-expand when multiple templates', () => {
      render(
        <TemplatePathCard
          templates={[singleDayTemplate, multiDayTemplate]}
          basePath="/trainer/my-training"
        />,
      );
      expect(screen.queryByText('Upper')).not.toBeInTheDocument();
      expect(screen.queryByText('Push')).not.toBeInTheDocument();
    });

    it('clicking a template header expands its days', () => {
      render(
        <TemplatePathCard
          templates={[singleDayTemplate, multiDayTemplate]}
          basePath="/trainer/my-training"
        />,
      );
      fireEvent.click(screen.getByText('My PPL'));
      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(screen.getByText('Pull')).toBeInTheDocument();
      expect(screen.getByText('Legs')).toBeInTheDocument();
    });

    it('clicking an expanded template header collapses it', () => {
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      // It starts expanded (only 1 template)
      expect(screen.getByText('Upper')).toBeInTheDocument();
      fireEvent.click(screen.getByText('My Strength A'));
      expect(screen.queryByText('Upper')).not.toBeInTheDocument();
    });

    it('only one template is expanded at a time', () => {
      render(
        <TemplatePathCard
          templates={[singleDayTemplate, multiDayTemplate]}
          basePath="/trainer/my-training"
        />,
      );
      fireEvent.click(screen.getByText('My Strength A'));
      expect(screen.getByText('Upper')).toBeInTheDocument();
      fireEvent.click(screen.getByText('My PPL'));
      expect(screen.queryByText('Upper')).not.toBeInTheDocument();
      expect(screen.getByText('Push')).toBeInTheDocument();
    });

    it('Log button POSTs to /api/me/workout-logs and navigates to session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'log42' }),
      });
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      // singleDayTemplate auto-expands
      fireEvent.click(screen.getByRole('button', { name: /log/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/me/workout-logs',
          expect.objectContaining({ method: 'POST' }),
        );
      });
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.dayName).toBe('Upper');
      expect(body.sourceTemplateId).toBe('tplA');
      expect(body.sourceTemplateDayNumber).toBe(1);
      expect(body.plannedSets).toHaveLength(3);
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/log42'),
      );
    });

    it('shows buildPlannedSets with correct set shape', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'logX' }),
      });
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      fireEvent.click(screen.getByRole('button', { name: /log/i }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      const set = body.plannedSets[0];
      expect(set.exerciseName).toBe('Bench Press');
      expect(set.setNumber).toBe(1);
      expect(set.prescribedRepsMin).toBe(6);
      expect(set.prescribedRepsMax).toBe(8);
      expect(set.actualWeight).toBeNull();
      expect(set.actualReps).toBeNull();
    });

    it('on 409 ACTIVE_SESSION_EXISTS shows conflict dialog', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'active1', dayName: 'Push', setCount: 5 },
        }),
      });
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      fireEvent.click(screen.getByRole('button', { name: /log/i }));
      expect(await screen.findByTestId('conflict-dialog')).toBeInTheDocument();
      expect(screen.getByText(/active session: push/i)).toBeInTheDocument();
    });

    it('conflict dialog Cancel clears conflict state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: { _id: 'active1', dayName: 'Push', setCount: 5 },
        }),
      });
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      fireEvent.click(screen.getByRole('button', { name: /log/i }));
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      await waitFor(() =>
        expect(screen.queryByTestId('conflict-dialog')).not.toBeInTheDocument(),
      );
    });

    it('conflict dialog "Delete and Start" re-POSTs with deleteActive=true', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'ACTIVE_SESSION_EXISTS',
            activeSession: { _id: 'active1', dayName: 'Push', setCount: 5 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: 'newLog' }),
        });
      render(
        <TemplatePathCard templates={[singleDayTemplate]} basePath="/trainer/my-training" />,
      );
      fireEvent.click(screen.getByRole('button', { name: /log/i }));
      await screen.findByTestId('conflict-dialog');
      fireEvent.click(screen.getByRole('button', { name: /delete and start/i }));
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/me/workout-logs?deleteActive=true',
          expect.objectContaining({ method: 'POST' }),
        ),
      );
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/newLog'),
      );
    });
  });
});
