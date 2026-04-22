import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('NutritionTemplateForm', () => {
  it('renders name and description fields', () => {
    render(<NutritionTemplateForm onSubmit={jest.fn()} foods={[]} />);
    expect(screen.getByLabelText(/计划名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/描述/i)).toBeInTheDocument();
  });

  it('can add a day type', () => {
    render(<NutritionTemplateForm onSubmit={jest.fn()} foods={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /添加天类型/i }));
    expect(screen.getByPlaceholderText(/如：训练日/i)).toBeInTheDocument();
  });

  it('calls onSubmit with plan data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<NutritionTemplateForm onSubmit={onSubmit} foods={[]} />);

    await user.type(screen.getByLabelText(/计划名称/i), '减脂计划');
    fireEvent.click(screen.getByRole('button', { name: /保存/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: '减脂计划' }),
    ));
  });

  it('pre-fills fields when initialData provided', () => {
    render(
      <NutritionTemplateForm
        onSubmit={jest.fn()}
        foods={[]}
        initialData={{ name: '增肌计划', description: '高蛋白', dayTypes: [] }}
      />,
    );
    expect(screen.getByDisplayValue('增肌计划')).toBeInTheDocument();
    expect(screen.getByDisplayValue('高蛋白')).toBeInTheDocument();
  });
});
