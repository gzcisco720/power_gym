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

it('shows Log Today when member has no log today (todayLog=null)', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={null}
    />,
  );
  expect(screen.getByRole('button', { name: /log today/i })).toBeInTheDocument();
});

it('shows Continue Today log button when member has incomplete log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={{ kcal: 800, dayCompleted: false }}
    />,
  );
  expect(screen.getByRole('button', { name: /continue today/i })).toBeInTheDocument();
  expect(screen.getByText(/800/)).toBeInTheDocument();
});

it('shows Continue Today log in light state when member has incomplete log today', () => {
  render(
    <NutritionFreestylePathCard
      state="light"
      lastFreestyle={{ dateLabel: 'Mon', kcal: 2087, protein: 162, carbs: 228, fat: 58 }}
      basePath="/member/nutrition"
      todayLog={{ kcal: 800, dayCompleted: false }}
    />,
  );
  expect(screen.getByRole('button', { name: /continue today/i })).toBeInTheDocument();
  // Default "Log Today (Freestyle)" button must NOT appear
  expect(screen.queryByRole('button', { name: /log today \(freestyle\)/i })).not.toBeInTheDocument();
});

it('shows View Today log button when member has completed log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/member/nutrition"
      todayLog={{ kcal: 2100, dayCompleted: true }}
    />,
  );
  expect(screen.getByRole('button', { name: /view today/i })).toBeInTheDocument();
  // "Log Today" must NOT appear — prevents re-logging
  expect(screen.queryByRole('button', { name: /^log today$/i })).not.toBeInTheDocument();
});

it('owner/trainer state=full is unaffected when no todayLog prop', () => {
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

it('shows Continue Today log button for owner when incomplete log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/owner/my-nutrition"
      todayLog={{ kcal: 900, dayCompleted: false }}
    />,
  );
  expect(screen.getByRole('button', { name: /continue today/i })).toBeInTheDocument();
});

it('shows View Today log button for owner when completed log today', () => {
  render(
    <NutritionFreestylePathCard
      state="empty"
      basePath="/owner/my-nutrition"
      todayLog={{ kcal: 2000, dayCompleted: true }}
    />,
  );
  expect(screen.getByRole('button', { name: /view today/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /log today/i })).not.toBeInTheDocument();
});
