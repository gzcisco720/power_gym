import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanTemplateForm } from './plan-template-form';

describe('PlanTemplateForm', () => {
  it('Save disabled when not dirty in edit mode', () => {
    const initialData = {
      name: 'My Plan',
      description: null,
      days: [],
    };

    render(
      <MemoryRouter>
        <PlanTemplateForm
          initialData={initialData}
          exercises={[]}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    );

    const saveBtn = screen.getByRole('button', { name: /save plan/i });
    expect(saveBtn).toBeDisabled();
  });
});
