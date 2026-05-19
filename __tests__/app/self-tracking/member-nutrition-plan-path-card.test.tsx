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
  render(<MemberNutritionPlanPathCard plan={null} />);
  expect(screen.getByText(/no nutrition plan assigned/i)).toBeInTheDocument();
});

it('shows plan name and trainer', () => {
  render(<MemberNutritionPlanPathCard plan={plan} />);
  expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
  expect(screen.getByText(/coach li/i)).toBeInTheDocument();
});

it('shows all day types with Log buttons', () => {
  render(<MemberNutritionPlanPathCard plan={plan} />);
  expect(screen.getByText('Training Day')).toBeInTheDocument();
  expect(screen.getByText('Rest Day')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});

it('Log button navigates with correct params', () => {
  const pushMock = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ push: pushMock } as ReturnType<typeof useRouter>);
  render(<MemberNutritionPlanPathCard plan={plan} />);
  screen.getAllByRole('button', { name: /log/i })[0].click();
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('mode=plan'));
  expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('dayTypeName='));
});
