import { render, screen } from '@testing-library/react';
import TrainerMembersPage from '@/app/(dashboard)/trainer/members/page';

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn().mockImplementation(() => ({
    findAllMembers: jest.fn().mockResolvedValue([
      {
        _id: { toString: () => 'mem1' },
        name: 'Alice Test',
        email: 'alice@test.com',
      },
    ]),
  })),
}));

import { auth } from '@/lib/auth/auth';

beforeEach(() => {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'trainer1', role: 'trainer' },
  });
});

test('renders member list with email and navigation links', async () => {
  const ui = await TrainerMembersPage();
  render(ui);

  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /plan/i })).toBeInTheDocument();
});
