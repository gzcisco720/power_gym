import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';

describe('NutritionTemplateForm', () => {
  it('opens day type dialog when + Day Type clicked', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ day type/i }));
    expect(screen.getByText(/new day type/i)).toBeInTheDocument();
  });
});
