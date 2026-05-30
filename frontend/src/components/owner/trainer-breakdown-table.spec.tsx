import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrainerBreakdownTable } from './trainer-breakdown-table';

const trainers = [
  { _id: 't1', name: 'Alice Smith', email: 'alice@gym.com', createdAt: '2024-01-01T00:00:00.000Z', memberCount: 3, sessionsThisMonth: 12 },
  { _id: 't2', name: 'Bob Jones', email: 'bob@gym.com', createdAt: '2024-02-01T00:00:00.000Z', memberCount: 1, sessionsThisMonth: 4 },
];

describe('TrainerBreakdownTable', () => {
  it('renders a row per trainer with member count', () => {
    render(
      <MemoryRouter>
        <TrainerBreakdownTable trainers={trainers} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    // Each trainer row should show member count
    expect(screen.getAllByText(/3/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no trainers', () => {
    render(
      <MemoryRouter>
        <TrainerBreakdownTable trainers={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No trainers yet/i)).toBeInTheDocument();
  });
});
