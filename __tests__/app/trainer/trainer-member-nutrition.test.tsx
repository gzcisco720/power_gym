import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockTemplates = [
  { _id: 'tpl1', name: '减脂计划' },
  { _id: 'tpl2', name: '增肌计划' },
];

const mockActivePlan = {
  _id: 'np1',
  name: '减脂计划',
  dayTypes: [{ name: '训练日' }, { name: '休息日' }],
  assignedAt: new Date().toISOString(),
};

describe('TrainerMemberNutritionClient', () => {
  it('shows current active nutrition plan when present', () => {
    render(
      <TrainerMemberNutritionClient
        memberId="m1"
        templates={mockTemplates}
        activePlan={mockActivePlan}
      />,
    );
    expect(screen.getAllByText('减脂计划').length).toBeGreaterThan(0);
  });

  it('shows "未分配营养计划" when no active plan', () => {
    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );
    expect(screen.getByText(/未分配营养计划/i)).toBeInTheDocument();
  });

  it('shows template select and assign button', () => {
    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /分配计划/i })).toBeInTheDocument();
  });

  it('calls assign API when button clicked', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(
      <TrainerMemberNutritionClient memberId="m1" templates={mockTemplates} activePlan={null} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tpl1' } });
    fireEvent.click(screen.getByRole('button', { name: /分配计划/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/members/m1/nutrition',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
