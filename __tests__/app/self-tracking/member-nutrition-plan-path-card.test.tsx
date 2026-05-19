import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { MemberNutritionPlanPathCard } from '@/components/self-tracking/member-nutrition-plan-path-card';

jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }));

const plan = {
  _id: 'plan1',
  name: 'Muscle Gain Plan',
  assignedByName: 'Coach Li',
  dayTypes: [
    { name: 'Training Day', targetKcal: 2200, targetProtein: 170, targetCarbs: 240, targetFat: 60 },
    { name: 'Rest Day', targetKcal: 1800, targetProtein: 160, targetCarbs: 170, targetFat: 58 },
  ],
};

it('shows empty state when no plan', () => {
  render(<MemberNutritionPlanPathCard plan={null} todayDayTypeName={null} />);
  expect(screen.getByText(/no nutrition plan assigned/i)).toBeInTheDocument();
});

it('shows plan name and trainer', () => {
  render(<MemberNutritionPlanPathCard plan={plan} todayDayTypeName={null} />);
  expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
  expect(screen.getByText(/coach li/i)).toBeInTheDocument();
});

it('shows all day types with Log buttons', () => {
  render(<MemberNutritionPlanPathCard plan={plan} todayDayTypeName={null} />);
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  expect(screen.getByText('Rest Day')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});

it('Log button navigates with correct params', () => {
  const pushMock = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
  render(<MemberNutritionPlanPathCard plan={plan} todayDayTypeName={null} />);
  screen.getAllByRole('button', { name: /log/i })[0].click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('mode=plan'));
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('dayTypeName='));
});

it('shows single Log Today button when todayDayTypeName is set', () => {
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName="Training Day"
    />,
  );
  expect(screen.getByRole('button', { name: /log today/i })).toBeInTheDocument();
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  // Should NOT show Rest Day (the other day type)
  expect(screen.queryByText('Rest Day')).not.toBeInTheDocument();
});

it('navigates to mode=plan WITHOUT dayTypeName when todayDayTypeName is set', () => {
  const pushMock = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName="Training Day"
    />,
  );
  screen.getByRole('button', { name: /log today/i }).click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('mode=plan'));
  expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining('dayTypeName'));
});

it('shows all day types when todayDayTypeName is null (no schedule)', () => {
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName={null}
    />,
  );
  expect(screen.getByText(/no plan for today/i)).toBeInTheDocument();
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  expect(screen.getByText('Rest Day')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});

it('fallback navigates with dayTypeName when no schedule', () => {
  const pushMock = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
  render(
    <MemberNutritionPlanPathCard
      plan={plan}
      todayDayTypeName={null}
    />,
  );
  screen.getAllByRole('button', { name: /log/i })[0].click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('dayTypeName='));
});
