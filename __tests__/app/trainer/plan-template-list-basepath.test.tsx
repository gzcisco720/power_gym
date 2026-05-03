import { render, screen } from '@testing-library/react';
import { PlanTemplateList } from '@/app/(dashboard)/trainer/plans/_components/plan-template-list';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: React.HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  },
  useReducedMotion: () => false,
}));

const mockTemplates = [
  { _id: 'tpl1', name: 'PPL', description: null, days: [] },
];

describe('PlanTemplateList basePath', () => {
  it('uses /trainer/plans by default for new and edit links', () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    const newLinks = screen.getAllByRole('link', { name: /New Template/i });
    expect(newLinks[0]).toHaveAttribute('href', '/trainer/plans/new');
    const editLink = screen.getByRole('link', { name: /Edit/i });
    expect(editLink).toHaveAttribute('href', '/trainer/plans/tpl1/edit');
  });

  it('uses custom basePath when provided', () => {
    render(<PlanTemplateList templates={mockTemplates} basePath="/owner/plans" />);
    const newLinks = screen.getAllByRole('link', { name: /New Template/i });
    expect(newLinks[0]).toHaveAttribute('href', '/owner/plans/new');
    const editLink = screen.getByRole('link', { name: /Edit/i });
    expect(editLink).toHaveAttribute('href', '/owner/plans/tpl1/edit');
  });
});
