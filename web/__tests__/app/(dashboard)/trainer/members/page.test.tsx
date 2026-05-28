import { render, screen } from '@testing-library/react';
import TrainerMembersPage from '@/app/(dashboard)/trainer/members/page';

jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  usePathname: () => '/trainer/members',
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({
    findAllMembers: jest.fn().mockResolvedValue([
      {
        _id: { toString: () => 'mem1' },
        name: 'Alice Test',
        email: 'alice@test.com',
        createdAt: new Date(),
      },
    ]),
  })),
}));
jest.mock('@/lib/repositories/workout-session.repository', () => ({
  MongoWorkoutSessionRepository: jest.fn().mockImplementation(() => ({
    countByMemberIdsSince: jest.fn().mockResolvedValue(5),
  })),
}));

import { auth } from '@/lib/auth/auth';

beforeEach(() => {
  (auth as jest.Mock).mockResolvedValue({ user: { id: 'trainer1', role: 'trainer' } });
});

test('renders member list with KPI strip', async () => {
  const ui = await TrainerMembersPage();
  render(ui);
  expect(screen.getByText('Alice Test')).toBeInTheDocument();
  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  expect(screen.getByText('Total Members')).toBeInTheDocument();
  expect(screen.getByText('Sessions This Month')).toBeInTheDocument();
  expect(screen.getByText('New This Month')).toBeInTheDocument();
});

test('renders View Hub link', async () => {
  const ui = await TrainerMembersPage();
  render(ui);
  const link = screen.getByRole('link', { name: /view hub/i });
  expect(link).toHaveAttribute('href', '/trainer/members/mem1');
});
