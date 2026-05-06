import { render, screen, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('TrainerMemberNutritionClient', () => {
  it('renders three tabs', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} basePathPrefix="trainer" />);
    expect(screen.getByRole('tab', { name: /current plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /schedule/i })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('renders active plan summary', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _id: 'np1', name: 'Bulk', dayTypes: [{ name: 'Training', targetKcal: 2800, targetProtein: 200, targetCarbs: 300, targetFat: 80, meals: [] }],
        assignedAt: '2026-04-10T00:00:00Z', schedule: { weeklyPattern: [], calendarOverrides: [] },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} basePathPrefix="trainer" />);
    await waitFor(() => expect(screen.getByText(/Bulk/)).toBeInTheDocument());
  });
});
