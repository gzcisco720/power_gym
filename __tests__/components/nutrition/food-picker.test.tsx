import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { FoodPicker } from '@/components/nutrition/food-picker';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFatSecretFood(overrides = {}) {
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
      {
        servingId: 's2',
        description: '1 breast (172 g)',
        grams: 172,
        calories: 284,
        protein: 53.3,
        carbs: 0,
        fat: 6.2,
      },
    ],
    ...overrides,
  };
}

function makeRecentItem() {
  return {
    foodName: 'Oats',
    quantityG: 80,
    kcal: 300,
    protein: 10,
    carbs: 54,
    fat: 5,
  };
}

function makeMyFoodItem() {
  return {
    _id: 'mf1',
    name: 'Protein Powder',
    brand: 'MyBrand',
    macrosPer100g: { kcal: 380, protein: 75, carbs: 10, fat: 5 },
    servings: [{ label: '1 scoop (30g)', grams: 30 }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FoodPicker', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- Tab rendering -------------------------------------------------------

  it('renders 3 tabs by default (All, Recent, My Food)', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /recent/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my food/i })).toBeInTheDocument();
  });

  it('renders only 2 tabs (All, My Food) when hideRecent is true', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} hideRecent />);
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /recent/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my food/i })).toBeInTheDocument();
  });

  it('shows a 2-column grid when hideRecent is true', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} hideRecent />);
    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('grid-cols-2');
  });

  // ---- Attribution ---------------------------------------------------------

  it('renders "Powered by FatSecret" attribution', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    expect(screen.getByText(/powered by fatsecret/i)).toBeInTheDocument();
  });

  // ---- Create New link -----------------------------------------------------

  it('renders "+ Create New" link when onCreateNewHref is provided', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} onCreateNewHref="/trainer/foods/new" />);
    const link = screen.getByRole('link', { name: /create new/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/trainer/foods/new');
  });

  it('does not render "+ Create New" link when onCreateNewHref is absent', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    expect(screen.queryByRole('link', { name: /create new/i })).not.toBeInTheDocument();
  });

  // ---- All tab: search input + debounce ------------------------------------

  it('does not call /api/food-search before user types', () => {
    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls /api/food-search after 300ms debounce on input', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(299);
    });
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/food-search?q=chicken'),
    );
    jest.useRealTimers();
  });

  // ---- All tab: selecting a result reveals detail panel --------------------

  it('renders search results and shows detail panel on row click', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());

    // Click the list row
    fireEvent.click(screen.getByText('Chicken Breast'));

    // Detail panel should appear
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    jest.useRealTimers();
  });

  // ---- All tab: clicking Add calls onSelect with computed macros -----------

  it('calls onSelect with correct macros when Add is clicked', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ results: [makeFatSecretFood()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/search foods/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'chicken' } });
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Chicken Breast')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Chicken Breast'));

    await waitFor(() => expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0];
    expect(picked.foodName).toBe('Chicken Breast');
    expect(picked.quantityG).toBeGreaterThan(0);
    expect(picked.macros).toMatchObject({
      kcal: expect.any(Number),
      protein: expect.any(Number),
      carbs: expect.any(Number),
      fat: expect.any(Number),
    });
    jest.useRealTimers();
  });

  // ---- Recent tab ----------------------------------------------------------

  it('fetches from /api/members/[memberId]/nutrition/recent on Recent tab', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ recent: [makeRecentItem()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/members/m1/nutrition/recent'),
    );

    await waitFor(() => expect(screen.getByText('Oats')).toBeInTheDocument());
  });

  it('calls onSelect when a recent item is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ recent: [makeRecentItem()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }));

    await waitFor(() => expect(screen.getByText('Oats')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Oats'));

    expect(onSelect).toHaveBeenCalledWith({
      foodName: 'Oats',
      quantityG: 80,
      macros: { kcal: 300, protein: 10, carbs: 54, fat: 5 },
    });
  });

  it('shows "No recent items" when recent list is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ recent: [] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /recent/i }));

    await waitFor(() => expect(screen.getByText(/no recent items/i)).toBeInTheDocument());
  });

  // ---- My Food tab ---------------------------------------------------------

  it('fetches /api/foods on My Food tab', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ foods: [makeMyFoodItem()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /my food/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/foods'));
    await waitFor(() => expect(screen.getByText(/protein powder/i)).toBeInTheDocument());
  });

  it('calls onSelect with macros when My Food Add button clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ foods: [makeMyFoodItem()] }), { status: 200 }),
    );

    render(<FoodPicker memberId="m1" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /my food/i }));

    await waitFor(() => expect(screen.getByText('MyBrand · Protein Powder')).toBeInTheDocument());
    fireEvent.click(screen.getByText('MyBrand · Protein Powder'));

    await waitFor(() => expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0];
    expect(picked.foodName).toBe('MyBrand Protein Powder');
    expect(picked.macros.kcal).toBeCloseTo(380 * (30 / 100));
  });
});
