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

  it('renders Empty state with preset list and Browse button', () => {
    render(<TemplatePathCard state="empty" basePath="/trainer/my-training" />);
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument();
    expect(screen.getByText('Push · Pull · Legs')).toBeInTheDocument();
    expect(screen.getByText('Upper / Lower')).toBeInTheDocument();
    expect(screen.getByText('Full Body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse templates/i })).toBeInTheDocument();
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
