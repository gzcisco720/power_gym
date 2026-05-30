import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionTemplateList } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-list';

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  useReducedMotion: () => false,
}));

const mockTemplates = [
  {
    _id: 'tpl1',
    name: '减脂计划',
    description: '低热量方案',
    dayTypeNames: ['训练日', '休息日'],
    avgPerDay: { kcal: 1850, protein: 185, carbs: 200, fat: 50 },
  },
  {
    _id: 'tpl2',
    name: '增肌计划',
    description: null,
    dayTypeNames: [],
    avgPerDay: null,
  },
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

  it('shows day type names as chips', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('训练日')).toBeInTheDocument();
    expect(screen.getByText('休息日')).toBeInTheDocument();
  });

  it('shows macro averages when present', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText('1850')).toBeInTheDocument();
    expect(screen.getByText('185')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows "No day types yet" when template has none', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    expect(screen.getByText(/No day types yet/i)).toBeInTheDocument();
  });

  it('shows "New Template" link', () => {
    render(<NutritionTemplateList templates={mockTemplates} />);
    const links = screen.getAllByRole('link', { name: /New Template/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('shows empty state when no templates', () => {
    render(<NutritionTemplateList templates={[]} />);
    expect(screen.getByText(/No templates yet/i)).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<NutritionTemplateList templates={mockTemplates} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('tpl1'));
  });
});
