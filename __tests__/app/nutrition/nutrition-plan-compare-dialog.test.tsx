import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionPlanCompareDialog } from '@/components/nutrition/nutrition-plan-compare-dialog';

const planDayTypes = [
  { name: 'Training Day', targetKcal: 2200, targetProtein: 170, targetCarbs: 240, targetFat: 60 },
  { name: 'Rest Day', targetKcal: 1800, targetProtein: 160, targetCarbs: 170, targetFat: 58 },
];

const baseProps = {
  open: true,
  onOpenChange: jest.fn(),
  date: '2026-05-19',
  loggedKcal: 1840,
  loggedProtein: 148,
  loggedCarbs: 198,
  loggedFat: 68,
  planDayTypes,
};

it('renders pill for each plan day type', () => {
  render(<NutritionPlanCompareDialog {...baseProps} />);
  expect(screen.getByRole('button', { name: 'Training Day' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rest Day' })).toBeInTheDocument();
});

it('shows diff values when a day type is selected', () => {
  render(<NutritionPlanCompareDialog {...baseProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Training Day' }));
  expect(screen.getByText('−22g')).toBeInTheDocument(); // protein diff
});

it('calls onOpenChange(false) when Done is clicked', () => {
  const onOpenChange = jest.fn();
  render(<NutritionPlanCompareDialog {...baseProps} onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
