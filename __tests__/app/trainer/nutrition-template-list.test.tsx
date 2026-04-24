import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionTemplateList } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

const mockTemplates = [
  { _id: 'tpl1', name: '减脂计划', description: '低热量方案', dayTypes: [{ name: '训练日' }, { name: '休息日' }] },
  { _id: 'tpl2', name: '增肌计划', description: null, dayTypes: [] },
];

describe('NutritionTemplateList', () => {
  it('renders all template names', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('减脂计划')).toBeInTheDocument();
    expect(screen.getByText('增肌计划')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('低热量方案')).toBeInTheDocument();
  });

  it('shows day type count', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('2 种天类型')).toBeInTheDocument();
  });

  it('shows "新建营养计划" link', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    const links = screen.getAllByRole('link', { name: /新建营养计划/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('shows empty state when no templates', () => {
    render(<NutritionTemplateList templates={[]} />);
    expect(screen.getByText(/还没有营养计划/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<NutritionTemplateList templates={mockTemplates} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /删除/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tpl1'));
  });
});
