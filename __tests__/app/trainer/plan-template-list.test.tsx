import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanTemplateList } from '@/app/(dashboard)/trainer/plans/_components/plan-template-list';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

const mockTemplates = [
  { _id: 'tpl1', name: 'Push Pull Legs', description: 'Classic PPL split', days: [] },
  { _id: 'tpl2', name: 'Upper Lower', description: null, days: [] },
];

describe('PlanTemplateList', () => {
  it('renders all template names', async () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    expect(await screen.findByText('Push Pull Legs')).toBeInTheDocument();
    expect(await screen.findByText('Upper Lower')).toBeInTheDocument();
  });

  it('shows description when present', async () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    expect(await screen.findByText('Classic PPL split')).toBeInTheDocument();
  });

  it('shows "新建计划" link', async () => {
    render(<PlanTemplateList templates={mockTemplates} />);
    const links = await screen.findAllByRole('link', { name: /新建计划/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('shows empty state when no templates', async () => {
    render(<PlanTemplateList templates={[]} />);
    expect(await screen.findByText(/还没有训练计划/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<PlanTemplateList templates={mockTemplates} onDelete={onDelete} />);

    const deleteButtons = await screen.findAllByRole('button', { name: /删除/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tpl1'));
  });
});
