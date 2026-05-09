import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatePathCard } from '@/components/self-tracking/template-path-card';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/components/self-tracking/template-day-picker-dialog', () => ({
  TemplateDayPickerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="picker-dialog">picker open</div> : null,
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const sampleSet = {
  exerciseId: 'ex1',
  exerciseName: 'Bench',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 6,
  prescribedRepsMax: 8,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
} as unknown as import('@/lib/db/models/self-workout-log.model').ISelfWorkoutSet;

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
  it('renders Full state with cycle-progress dots and Start button', () => {
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[
          { name: 'Bench Press', prescribed: '4×6-8', lastWeight: 92.5 },
          { name: 'Overhead Press', prescribed: '3×8', lastWeight: 60 },
        ]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByRole('heading', { name: /day 3/i })).toBeInTheDocument();
    expect(screen.getByText('Push · Pull · Legs')).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start day 3/i })).toBeInTheDocument();
  });

  it('renders Light state without last weights', () => {
    render(
      <TemplatePathCard
        state="light"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 2, dayName: 'Pull' }}
        cycleSize={6}
        completedDayNumbers={[1]}
        exercisePreview={[{ name: 'Bench Press', prescribed: '4×6-8', lastWeight: null }]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.getByRole('button', { name: /start day 2/i })).toBeInTheDocument();
    expect(screen.queryByText(/last 9/)).not.toBeInTheDocument();
  });

  describe('Empty state', () => {
    it('shows "no templates yet" hint + disabled Start when user has 0 templates', () => {
      render(
        <TemplatePathCard
          state="empty"
          basePath="/trainer/my-training"
          templates={[]}
        />,
      );
      expect(screen.getByText(/pick a template/i)).toBeInTheDocument();
      expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
      const startBtn = screen.getByRole('button', { name: /start to log/i });
      expect(startBtn).toBeDisabled();
      expect(screen.getByRole('button', { name: /\+ create/i })).toBeInTheDocument();
    });

    it('Create button routes to plans/new', () => {
      render(
        <TemplatePathCard
          state="empty"
          basePath="/owner/my-training"
          templates={[]}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /\+ create/i }));
      expect(pushMock).toHaveBeenCalledWith('/owner/plans/new');
    });

    it('renders user templates as a selectable list with Start disabled until selection', () => {
      render(
        <TemplatePathCard
          state="empty"
          basePath="/trainer/my-training"
          templates={[singleDayTemplate, multiDayTemplate]}
        />,
      );
      expect(screen.getByText('My Strength A')).toBeInTheDocument();
      expect(screen.getByText('My PPL')).toBeInTheDocument();
      const startBtn = screen.getByRole('button', { name: /start to log/i });
      expect(startBtn).toBeDisabled();
    });

    it('selecting a template highlights it and enables Start', () => {
      render(
        <TemplatePathCard
          state="empty"
          basePath="/trainer/my-training"
          templates={[singleDayTemplate, multiDayTemplate]}
        />,
      );
      const row = screen.getByRole('option', { name: /my strength a/i });
      expect(row).toHaveAttribute('aria-selected', 'false');
      fireEvent.click(row);
      expect(row).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: /start to log/i })).not.toBeDisabled();
    });

    it('Start to log on a single-day template posts to API and navigates without opening picker', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'log42' }),
      });
      render(
        <TemplatePathCard
          state="empty"
          basePath="/trainer/my-training"
          templates={[singleDayTemplate]}
        />,
      );
      fireEvent.click(screen.getByRole('option', { name: /my strength a/i }));
      fireEvent.click(screen.getByRole('button', { name: /start to log/i }));
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
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Start to log on a multi-day template opens day picker; selecting a day fires API + navigate', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: 'log99' }),
      });
      render(
        <TemplatePathCard
          state="empty"
          basePath="/trainer/my-training"
          templates={[multiDayTemplate]}
        />,
      );
      fireEvent.click(screen.getByRole('option', { name: /my ppl/i }));
      fireEvent.click(screen.getByRole('button', { name: /start to log/i }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /day 2 — pull/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.dayName).toBe('Pull');
      expect(body.sourceTemplateId).toBe('tplB');
      expect(body.sourceTemplateDayNumber).toBe(2);
      await waitFor(() =>
        expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/log99'),
      );
    });
  });

  it('"Start Day N" posts to /api/me/workout-logs and routes to the session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ _id: 'log9' }) });
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /start day 3/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/workout-logs',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.dayName).toBe('Push');
    expect(body.sourceTemplateId).toBe('tpl1');
    expect(body.sourceTemplateDayNumber).toBe(3);
    expect(body.plannedSets).toHaveLength(1);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/trainer/my-training/session/log9'));
  });

  it('"Pick another day" opens the TemplateDayPickerDialog', () => {
    render(
      <TemplatePathCard
        state="full"
        templateId="tpl1"
        templateName="Push · Pull · Legs"
        nextDay={{ dayNumber: 3, dayName: 'Push' }}
        cycleSize={6}
        completedDayNumbers={[1, 2]}
        exercisePreview={[]}
        plannedSets={[sampleSet]}
        basePath="/trainer/my-training"
      />,
    );
    expect(screen.queryByTestId('picker-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pick another day/i }));
    expect(screen.getByTestId('picker-dialog')).toBeInTheDocument();
  });
});
