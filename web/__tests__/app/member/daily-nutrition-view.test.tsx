import { render, screen, waitFor } from '@testing-library/react';
import { DailyNutritionView } from '@/components/nutrition/daily-nutrition-view';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('DailyNutritionView', () => {
  it('shows EmptyState when log is null', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }));
    render(<DailyNutritionView memberId="m1" initialDate="2026-05-06" />);
    await waitFor(() => expect(screen.getByText(/hasn't scheduled/i)).toBeInTheDocument());
  });

  it('renders meals when log exists', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      memberId: 'm1', planId: 'np1', date: '2026-05-06',
      dayTypeName: 'Training',
      meals: [{
        name: 'Breakfast', order: 1, completed: false,
        items: [{ foodName: 'Egg', quantityG: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }],
      }],
      dayCompleted: false,
    }), { status: 200 }));
    render(<DailyNutritionView memberId="m1" initialDate="2026-05-06" />);
    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());
    expect(screen.getByText('Egg')).toBeInTheDocument();
  });
});
