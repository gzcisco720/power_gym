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

test('renders member list with name and email as a hub link', async () => {
  const ui = await TrainerMembersPage();
  render(ui);

  expect(screen.getByText('Alice Test')).toBeInTheDocument();
  expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  const link = screen.getByRole('link', { name: /alice test/i });
  expect(link).toHaveAttribute('href', '/trainer/members/mem1');
});
