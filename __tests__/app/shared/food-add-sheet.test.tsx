import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FoodAddSheet } from '@/components/nutrition/food-add-sheet';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

function setup(onAdd = jest.fn()) {
  render(<FoodAddSheet open onOpenChange={() => undefined} onAdd={onAdd} />);
  return { onAdd };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

describe('FoodAddSheet — Search tab', () => {
  it('debounces search and renders normalised results', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{ name: 'Egg', per100g: { kcal: 155, protein: 13, carbs: 1, fat: 11 } }],
    }), { status: 200 }));

    setup();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'egg' } });
    expect(mockFetch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Egg')).toBeInTheDocument();
  });

  it('selecting a result and entering quantity calls onAdd with scaled macros', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{ name: 'Egg', per100g: { kcal: 155, protein: 13, carbs: 1, fat: 11 } }],
    }), { status: 200 }));
    const { onAdd } = setup();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'egg' } });
    await act(async () => { jest.advanceTimersByTime(350); });
    await waitFor(() => screen.getByText('Egg'));
    fireEvent.click(screen.getByText('Egg'));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      foodName: 'Egg',
      quantityG: 50,
      kcal: 77.5,
    }));
  });
});

describe('FoodAddSheet — Manual tab', () => {
  it('manual entry computes totals from per-100g and amount', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole('tab', { name: /manual/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Custom' } });
    fireEvent.change(screen.getByLabelText(/^kcal$/i), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText(/^protein$/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/^carbs$/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/^fat$/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/^amount/i), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      foodName: 'Custom',
      quantityG: 50,
      kcal: 100,
      protein: 10,
    }));
  });
});
