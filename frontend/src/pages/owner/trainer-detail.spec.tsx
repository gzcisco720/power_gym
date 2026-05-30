import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/stores/trainersStore', () => ({
  useTrainersStore: vi.fn(),
}));

import { useTrainersStore } from '@/stores/trainersStore';
import { OwnerTrainerDetailPage } from './trainer-detail';

const TRAINER = {
  _id: 't1',
  name: 'Test Trainer',
  email: 'trainer@test.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  memberCount: 2,
  sessionsThisMonth: 5,
  templateCount: 3,
};

const MEMBERS = [
  {
    _id: 'm1',
    name: 'Alice Member',
    email: 'alice@test.com',
    trainerId: 't1',
    streak: 3,
    sessionsThisMonth: 4,
    status: 'active' as const,
  },
  {
    _id: 'm2',
    name: 'Bob Member',
    email: 'bob@test.com',
    trainerId: 't1',
    streak: 0,
    sessionsThisMonth: 0,
    status: 'needs-attn' as const,
  },
];

function mockStore(state: {
  trainerDetail: typeof TRAINER | null;
  trainerMembers: typeof MEMBERS;
  trainerPlans: { _id: string; name: string; daysCount: number; createdAt: string }[];
  trainerNutritionPlans: { _id: string; name: string; dayTypesCount: number; createdAt: string }[];
  isLoading: boolean;
  error: string | null;
  fetchTrainerDetail: () => Promise<void>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useTrainersStore).mockImplementation((selector?: (s: any) => any) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrainerDetailLayout', () => {
  it('renders a tab per sub-route', () => {
    mockStore({
      trainerDetail: TRAINER,
      trainerMembers: [],
      trainerPlans: [],
      trainerNutritionPlans: [],
      isLoading: false,
      error: null,
      fetchTrainerDetail: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/owner/trainers/t1']}>
        <Routes>
          <Route path="/owner/trainers/:id/*" element={<OwnerTrainerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Training Plans' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Nutrition Plans' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Calendar' })).toBeInTheDocument();
  });
});

describe('TrainerHubMembers', () => {
  it('renders a row per assigned member', () => {
    mockStore({
      trainerDetail: TRAINER,
      trainerMembers: MEMBERS,
      trainerPlans: [],
      trainerNutritionPlans: [],
      isLoading: false,
      error: null,
      fetchTrainerDetail: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/owner/trainers/t1/members']}>
        <Routes>
          <Route path="/owner/trainers/:id/*" element={<OwnerTrainerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Click the Members tab to show members content
    // Since initialEntries is /members, the Members tab content should render
    expect(screen.getByText('Alice Member')).toBeInTheDocument();
    expect(screen.getByText('Bob Member')).toBeInTheDocument();
  });
});
