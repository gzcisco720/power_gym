import { render, screen } from '@testing-library/react';
import { NutritionFreestylePathCard } from '@/components/self-tracking/nutrition-freestyle-path-card';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

it('shows empty state with Log Today button when no logs', () => {
  render(<NutritionFreestylePathCard state="empty" basePath="/owner/my-nutrition" />);
  expect(screen.getByRole('button', { name: /log today/i })).toBeInTheDocument();
});

it('shows last log kcal in light state', () => {
  render(
    <NutritionFreestylePathCard
      state="light"
      lastFreestyle={{ dateLabel: 'Mon', kcal: 2087, protein: 162, carbs: 228, fat: 58 }}
      basePath="/owner/my-nutrition"
    />,
  );
  expect(screen.getByText('2,087 kcal')).toBeInTheDocument();
});

it('shows weekly frequency in full state', () => {
  render(
    <NutritionFreestylePathCard
      state="full"
      lastFreestyle={{ dateLabel: 'Mon', kcal: 2087, protein: 162, carbs: 228, fat: 58 }}
      daysThisWeek={5}
      basePath="/owner/my-nutrition"
    />,
  );
  expect(screen.getByText(/5× this week/i)).toBeInTheDocument();
});
