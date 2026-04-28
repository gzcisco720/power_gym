/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProgressClient } from '@/app/(dashboard)/member/progress/_components/progress-client';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const MEMBER_ID = 'member-123';
const EXERCISE = { exerciseId: 'ex-1', exerciseName: 'Bench Press' };

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('ProgressClient', () => {
  it('renders Training Frequency and Strength Progress headings', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ history: [] }),
    });

    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[EXERCISE]}
        memberId={MEMBER_ID}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Training Frequency')).toBeInTheDocument();
      expect(screen.getByText('Strength Progress')).toBeInTheDocument();
    });
  });

  it('shows empty state when exercises list is empty', () => {
    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[]}
        memberId={MEMBER_ID}
      />,
    );

    expect(screen.getByText('No exercise history yet.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders exercise names in the select dropdown', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ history: [] }),
    });

    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[EXERCISE, { exerciseId: 'ex-2', exerciseName: 'Squat' }]}
        memberId={MEMBER_ID}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Bench Press' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Squat' })).toBeInTheDocument();
    });
  });

  it('fetches history and renders chart data when exercise is selected', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        history: [{ date: '2026-04-01', estimatedOneRM: 80 }],
      }),
    });

    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[EXERCISE]}
        memberId={MEMBER_ID}
      />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/progress/${MEMBER_ID}?exerciseId=${EXERCISE.exerciseId}`,
      );
    });
  });

  it('shows toast error when fetch fails', async () => {
    const { toast } = await import('sonner');
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[EXERCISE]}
        memberId={MEMBER_ID}
      />,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('uses custom title when title prop is provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ history: [] }),
    });

    render(
      <ProgressClient
        heatmapData={[]}
        exercises={[EXERCISE]}
        memberId={MEMBER_ID}
        title="John's Progress"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: "John's Progress" })).toBeInTheDocument();
    });
  });
});
