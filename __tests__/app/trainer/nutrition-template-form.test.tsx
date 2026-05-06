import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';

describe('NutritionTemplateForm', () => {
  it('renders plan name input', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    expect(screen.getByLabelText(/plan name/i)).toBeInTheDocument();
  });

  it('adds a day type inline when + Add Day Type clicked', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    // Day type name input appears inline (not in a dialog)
    expect(screen.getByDisplayValue('Training Day')).toBeInTheDocument();
  });

  it('adds a meal within an existing day type', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    fireEvent.click(screen.getByRole('button', { name: /\+ add meal/i }));
    expect(screen.getByDisplayValue('Meal')).toBeInTheDocument();
  });

  it('removes a day type after confirming the delete dialog', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    expect(screen.getByDisplayValue('Training Day')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove day type/i }));
    // Confirmation dialog appears — clicking Delete confirms the removal
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByDisplayValue('Training Day')).not.toBeInTheDocument();
  });

  it('cancels deletion when Cancel clicked in the confirm dialog', () => {
    render(<NutritionTemplateForm onSubmit={async () => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    fireEvent.click(screen.getByRole('button', { name: /remove day type/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByDisplayValue('Training Day')).toBeInTheDocument();
  });

  it('renders with initial data', () => {
    const initialData = {
      name: 'Off Season',
      description: 'Bulk plan',
      dayTypes: [
        {
          name: 'High Day',
          meals: [{ name: 'Breakfast', order: 1, items: [] }],
        },
      ],
    };
    render(<NutritionTemplateForm initialData={initialData} onSubmit={async () => undefined} />);
    expect(screen.getByDisplayValue('Off Season')).toBeInTheDocument();
    expect(screen.getByDisplayValue('High Day')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Breakfast')).toBeInTheDocument();
  });
});
