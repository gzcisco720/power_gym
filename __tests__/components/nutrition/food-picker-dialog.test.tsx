import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

function triggerSearch(query: string): void {
  fireEvent.change(screen.getByPlaceholderText(/search foods/i), { target: { value: query } });
  fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
}
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
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [makeFatSecretFood()], food: makeFatSecretFood() }), { status: 200 })),
    );

    renderDialog();
    triggerSearch('chicken');

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to meal/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('tab', { name: /all/i })).not.toBeInTheDocument();
  });

  // ---- Detail → List (back button) ----------------------------------------

  it('returns to list view when Back button is clicked in detail view', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [makeFatSecretFood()], food: makeFatSecretFood() }), { status: 200 })),
    );

    renderDialog();
    triggerSearch('chicken');

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    });
  });

  // ---- Add button calls onSelect + closes dialog ---------------------------

  it('calls onSelect with PickedFood and closes dialog when Add is clicked', async () => {
    const onSelect = jest.fn<void, [PickedFood]>();
    const onOpenChange = jest.fn();

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [makeFatSecretFood()], food: makeFatSecretFood() }), { status: 200 })),
    );

    render(
      <FoodPickerDialog
        open={true}
        onOpenChange={onOpenChange}
        memberId="m1"
        onSelect={onSelect}
      />,
    );
    triggerSearch('chicken');

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

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ---- List → Create transition -------------------------------------------

  it('shows create-food form when "+ Create New" button is clicked', async () => {
    renderDialog({ open: true });
    const createBtn = screen.getByRole('button', { name: /create new/i });
    fireEvent.click(createBtn);
    // Dialog title should be visible as a heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create food/i })).toBeInTheDocument();
    });
    // Food list should be gone
    expect(screen.queryByRole('tab', { name: /all/i })).not.toBeInTheDocument();
  });

  it('returns to list view when Cancel is clicked in create view', async () => {
    renderDialog({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /create new/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /create food/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Food')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    });
  });

  it('transitions to detail view after successful food creation', async () => {
    const createdFood = {
      _id: 'food123',
      name: 'My Protein Bar',
      brand: 'TestBrand',
      macrosPer100g: { kcal: 400, protein: 30, carbs: 40, fat: 10 },
      servings: [{ label: '1 bar (50g)', grams: 50 }],
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    };

    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ food: createdFood }), { status: 200 }),
    );

    renderDialog({ open: true });
    fireEvent.click(screen.getByRole('button', { name: /create new/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /create food/i })).toBeInTheDocument(),
    );

    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. chicken breast/i), {
      target: { value: 'My Protein Bar' },
    });
    // Fill macros
    const numberInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(numberInputs[0], { target: { value: '400' } }); // kcal
    fireEvent.change(numberInputs[1], { target: { value: '30' } });  // protein
    fireEvent.change(numberInputs[2], { target: { value: '40' } });  // carbs
    fireEvent.change(numberInputs[3], { target: { value: '10' } });  // fat

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create food/i }));
      await Promise.resolve();
    });

    await waitFor(() => {
      // Should be in detail view now
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to meal/i })).toBeInTheDocument();
    });
  });

  // ---- Macro preview in detail view ----------------------------------------

  it('shows macro preview in detail view', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [makeFatSecretFood()], food: makeFatSecretFood() }), { status: 200 })),
    );

    renderDialog();
    triggerSearch('chicken');

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => {
      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('g P')).toBeInTheDocument();
      expect(screen.getByText('g C')).toBeInTheDocument();
      expect(screen.getByText('g F')).toBeInTheDocument();
    });
  });
});
