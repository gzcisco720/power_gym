import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberPlanClient } from '@/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockTemplates = [
  { _id: 'tpl1', name: 'Push Pull Legs' },
  { _id: 'tpl2', name: 'Upper Lower' },
];

const mockActivePlan = {
  _id: 'mp1',
  name: 'Push Pull Legs',
  days: [
    { dayNumber: 1, name: 'Day 1 — Push', exercises: [] },
    { dayNumber: 2, name: 'Day 2 — Pull', exercises: [] },
  ],
  assignedAt: new Date().toISOString(),
};

describe('TrainerMemberPlanClient', () => {
  it('shows current active plan when present', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={mockActivePlan}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getAllByText('Push Pull Legs').length).toBeGreaterThan(0);
  });

  it('shows "No plan assigned" when no active plan', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getByText(/No plan assigned/i)).toBeInTheDocument();
  });

  it('shows template select and assign button', () => {
    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Assign$/i })).toBeInTheDocument();
  });

  it('calls assign API when button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(
      <TrainerMemberPlanClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={null}
        sessions={[]}
        pbs={[]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tpl1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Assign$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/members/m1/plan',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
