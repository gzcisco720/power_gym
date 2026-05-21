import { render, screen, waitFor } from '@testing-library/react';
import { TrainerMemberNutritionClient } from '@/app/(dashboard)/trainer/members/[id]/nutrition/_components/trainer-member-nutrition-client';

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('TrainerMemberNutritionClient', () => {
  it('shows assign button when no active plan', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} recentLogs={[]} dayTypeTargets={{}} />);
    await waitFor(() => expect(screen.getByText(/No nutrition plan assigned/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /assign plan/i })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('renders active plan summary in hero card', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _id: 'np1',
        name: 'Bulk',
        dayTypes: [{ name: 'Training', meals: [] }],
        assignedAt: '2026-04-10T00:00:00Z',
        schedule: { weeklyPattern: [], calendarOverrides: [], iterate: true },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    render(<TrainerMemberNutritionClient memberId="m1" templates={[]} recentLogs={[]} dayTypeTargets={{}} />);
    await waitFor(() => expect(screen.getByText('Bulk')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /change plan/i })).toBeInTheDocument();
  });
});
