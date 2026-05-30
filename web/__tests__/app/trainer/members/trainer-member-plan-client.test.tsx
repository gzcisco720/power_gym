import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberPlanClient } from '@/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client';
import { toast } from 'sonner';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const mockProps = {
  memberId: 'm1',
  templates: [{ _id: 't1', name: 'Test Plan' }],
  activePlan: null,
  sessions: [],
  pbs: [],
};

async function openAssignDialogAndPick(value: string) {
  fireEvent.click(screen.getByRole('button', { name: /assign plan/i }));
  await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /^Assign$/ }));
}

describe('TrainerMemberPlanClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls toast.success when plan is assigned successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<TrainerMemberPlanClient {...mockProps} />);
    await openAssignDialogAndPick('t1');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plan assigned'));
  });

  it('calls toast.error with server message when assignment fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Plan not found' }),
    });
    render(<TrainerMemberPlanClient {...mockProps} />);
    await openAssignDialogAndPick('t1');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Plan not found'));
  });

  it('calls toast.error with fallback when server returns no message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<TrainerMemberPlanClient {...mockProps} />);
    await openAssignDialogAndPick('t1');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to assign plan'));
  });
});

// ─── Session History ──────────────────────────────────────────────────────────

function makeSession(
  id: string,
  dayName: string,
  startedAt: string,
): import('@/lib/training/session-summary').SessionSummary {
  return { _id: id, dayName, startedAt, completedAt: startedAt, exerciseCount: 2, setCount: 6, totalVolume: 2400 };
}

// 5 May + 4 Apr + 3 Mar = 12 sessions (sorted newest-first)
const SESSIONS_12 = [
  makeSession('s1',  'Push', '2026-05-13T12:00:00Z'),
  makeSession('s2',  'Pull', '2026-05-10T12:00:00Z'),
  makeSession('s3',  'Legs', '2026-05-06T12:00:00Z'),
  makeSession('s4',  'Push', '2026-05-03T12:00:00Z'),
  makeSession('s5',  'Pull', '2026-05-01T12:00:00Z'),
  makeSession('s6',  'Legs', '2026-04-29T12:00:00Z'),
  makeSession('s7',  'Push', '2026-04-26T12:00:00Z'),
  makeSession('s8',  'Pull', '2026-04-22T12:00:00Z'),
  makeSession('s9',  'Legs', '2026-04-19T12:00:00Z'),
  makeSession('s10', 'Push', '2026-03-15T12:00:00Z'),
  makeSession('s11', 'Pull', '2026-03-08T12:00:00Z'),
  makeSession('s12', 'Legs', '2026-03-01T12:00:00Z'),
];

describe('Session History', () => {
  const baseProps = {
    memberId: 'm1',
    templates: [],
    activePlan: null,
    pbs: [],
  };

  it('shows only 8 sessions initially when there are 12', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    // s1–s8 visible, s9–s12 not
    expect(screen.getAllByText('Push').length).toBeGreaterThan(0); // s1 visible
    expect(screen.queryByText('Mar 15, 2026')).not.toBeInTheDocument(); // s10 hidden
  });

  it('shows "Show 4 more sessions" button when 12 sessions and 8 visible', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByRole('button', { name: /show 4 more/i })).toBeInTheDocument();
  });

  it('reveals all sessions after clicking "Show more"', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    fireEvent.click(screen.getByRole('button', { name: /show 4 more/i }));
    expect(screen.getByText('Mar 15, 2026')).toBeInTheDocument(); // s10 now visible
  });

  it('does not show "Show more" button when sessions <= 8', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12.slice(0, 6)} />);
    expect(screen.queryByRole('button', { name: /show .* more/i })).not.toBeInTheDocument();
  });

  it('renders month group header "May 2026" for May sessions', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByText(/may 2026/i)).toBeInTheDocument();
  });

  it('renders month group header "Apr 2026" for April sessions', () => {
    render(<TrainerMemberPlanClient {...baseProps} sessions={SESSIONS_12} />);
    expect(screen.getByText(/apr 2026/i)).toBeInTheDocument();
  });
});
