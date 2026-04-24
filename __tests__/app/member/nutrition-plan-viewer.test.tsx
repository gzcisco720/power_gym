import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionPlanViewer } from '@/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer';

const mockPlan = {
  _id: 'np1',
  name: 'Fat Loss Plan',
  dayTypes: [
    {
      name: 'Training Day',
      targetKcal: 2500,
      targetProtein: 180,
      targetCarbs: 250,
      targetFat: 60,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          items: [
            { foodName: 'Oats', quantityG: 80, kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 },
          ],
        },
      ],
    },
    {
      name: 'Rest Day',
      targetKcal: 2000,
      targetProtein: 160,
      targetCarbs: 180,
      targetFat: 60,
      meals: [],
    },
  ],
};

describe('NutritionPlanViewer', () => {
  it('shows plan name', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('Fat Loss Plan')).toBeInTheDocument();
  });

  it('renders tab for each day type', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByRole('tab', { name: 'Training Day' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rest Day' })).toBeInTheDocument();
  });

  it('shows macro targets for active day type', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('2500')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('switches day type on tab click', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Rest Day' }));
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('shows meal and food items', () => {
    render(<NutritionPlanViewer plan={mockPlan} />);
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Oats')).toBeInTheDocument();
  });

  it('shows empty state when no plan', () => {
    render(<NutritionPlanViewer plan={null} />);
    expect(screen.getByText('No nutrition plan assigned')).toBeInTheDocument();
  });
});
