import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemberNutritionPlanForm } from '@/app/(dashboard)/trainer/members/[id]/nutrition/new/_components/member-nutrition-plan-form';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockPush.mockClear();
});

describe('MemberNutritionPlanForm', () => {
  it('disables Continue when name is empty', () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('disables Continue when no day types exist', () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue when name and at least one day type exist', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled(),
    );
  });

  it('pre-fills name and day types from initialData', () => {
    render(
      <MemberNutritionPlanForm
        memberId="m1"
        initialData={{
          name: 'Bulk Phase',
          dayTypes: [{ name: 'Training', meals: [] }],
          fromTemplateId: 'tpl1',
        }}
      />,
    );
    expect(screen.getByDisplayValue('Bulk Phase')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Training')).toBeInTheDocument();
  });

  it('Save as template checkbox reveals template name input', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    expect(screen.queryByPlaceholderText(/template name/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /save as template/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/template name/i)).toBeInTheDocument(),
    );
  });

  it('disables Continue when save-as-template is checked but template name is empty', async () => {
    render(<MemberNutritionPlanForm memberId="m1" initialData={null} />);
    fireEvent.change(screen.getByPlaceholderText(/plan name/i), { target: { value: 'My Plan' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ add day type/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /save as template/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled(),
    );
  });
});
