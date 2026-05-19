import { render, screen } from '@testing-library/react';
import { NutritionTemplatePathCard } from '@/components/self-tracking/nutrition-template-path-card';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const templates = [
  {
    _id: 'tpl1',
    name: 'Muscle Gain Plan',
    dayTypes: [
      { name: 'Training Day', targetKcal: 2400, targetProtein: 180, targetCarbs: 260, targetFat: 65 },
      { name: 'Rest Day', targetKcal: 1900, targetProtein: 170, targetCarbs: 180, targetFat: 60 },
    ],
  },
];

it('shows empty state when no templates', () => {
  render(<NutritionTemplatePathCard templates={[]} basePath="/owner/my-nutrition" />);
  expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
});

it('renders template name and day type count', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
  expect(screen.getByText('2 day types')).toBeInTheDocument();
});

it('auto-expands when only one template', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getByText('Training Day')).toBeInTheDocument();
});

it('shows Log button for each day type when expanded', () => {
  render(<NutritionTemplatePathCard templates={templates} basePath="/owner/my-nutrition" />);
  expect(screen.getAllByRole('button', { name: /log/i })).toHaveLength(2);
});
