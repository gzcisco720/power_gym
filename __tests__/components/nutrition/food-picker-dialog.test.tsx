import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { FoodPickerDialog } from '@/components/nutrition/food-picker-dialog';
import type { PickedFood } from '@/components/nutrition/food-picker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFatSecretFood() {
  return {
    foodId: 'f1',
    name: 'Chicken Breast',
    brand: null,
    foodType: 'Generic',
    defaultServing: {
      servingId: 's1',
      description: '100 g',
      grams: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    },
    servings: [
      {
        servingId: 's1',
        description: '100 g',
        grams: 100,
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
    ],
  };
}

interface RenderDialogOptions {
  open?: boolean;
  memberId?: string | null;
  onOpenChange?: jest.Mock;
  onSelect?: jest.Mock<void, [PickedFood]>;
}

function renderDialog({
  open = true,
  memberId = 'm1',
  onOpenChange = jest.fn(),
  onSelect = jest.fn(),
}: RenderDialogOptions = {}) {
  return render(
    <FoodPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      memberId={memberId}
      onSelect={onSelect}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FoodPickerDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- Open / close --------------------------------------------------------

  it('renders dialog content when open=true', () => {
    renderDialog({ open: true });
    expect(screen.getByText('Add Food')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
  });

  it('does not render dialog content when open=false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Add Food')).not.toBeInTheDocument();
  });

  // ---- List view -----------------------------------------------------------

  it('shows the list view with tabs by default', () => {
    renderDialog({ open: true, memberId: 'm1' });
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /recent/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my food/i })).toBeInTheDocument();
  });

  it('hides Recent tab when memberId is null', () => {
    renderDialog({ open: true, memberId: null });
    expect(screen.queryByRole('tab', { name: /recent/i })).not.toBeInTheDocument();
  });

  // ---- List → Detail transition -------------------------------------------

  it('swaps to detail view when a food row is clicked', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    renderDialog();
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    // Detail view should be shown
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to meal/i })).toBeInTheDocument();
    });

    // List view should be gone
    expect(screen.queryByRole('tab', { name: /all/i })).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  // ---- Detail → List (back button) ----------------------------------------

  it('returns to list view when Back button is clicked in detail view', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    renderDialog();
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    // Should be back to list view
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  // ---- Add button calls onSelect + closes dialog ---------------------------

  it('calls onSelect with PickedFood and closes dialog when Add is clicked', async () => {
    jest.useFakeTimers();
    const onSelect = jest.fn<void, [PickedFood]>();
    const onOpenChange = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    render(
      <FoodPickerDialog
        open={true}
        onOpenChange={onOpenChange}
        memberId="m1"
        onSelect={onSelect}
      />,
    );
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to meal/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked: PickedFood = onSelect.mock.calls[0][0];
    expect(picked.foodName).toBe('Chicken Breast');
    expect(picked.quantityG).toBeGreaterThan(0);
    expect(picked.macros).toMatchObject({
      kcal: expect.any(Number),
      protein: expect.any(Number),
      carbs: expect.any(Number),
      fat: expect.any(Number),
    });

    // Dialog should be requested to close
    expect(onOpenChange).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });

  // ---- Macro preview in detail view ----------------------------------------

  it('shows macro preview in detail view', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    renderDialog();
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => {
      // Should show macro labels in detail view
      expect(screen.getByText('kcal')).toBeInTheDocument();
      expect(screen.getByText('protein')).toBeInTheDocument();
      expect(screen.getByText('carbs')).toBeInTheDocument();
      expect(screen.getByText('fat')).toBeInTheDocument();
    });
    jest.useRealTimers();
  });
});
