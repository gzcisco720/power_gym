import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanTemplateList } from './plan-template-list';

const makeTemplate = (id: string, name: string) => ({
  _id: id,
  name,
  description: null,
  days: [{ name: 'Day 1', exercises: [] }],
});

describe('PlanTemplateList', () => {
  it('renders a card per template', () => {
    const templates = [
      makeTemplate('t1', 'Strength Program'),
      makeTemplate('t2', 'Hypertrophy Block'),
    ];

    render(
      <MemoryRouter>
        <PlanTemplateList templates={templates} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Strength Program')).toBeDefined();
    expect(screen.getByText('Hypertrophy Block')).toBeDefined();
  });
});
