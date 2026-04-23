import bcrypt from 'bcryptjs';
import { authorizeCredentials } from '@/lib/auth/auth';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { IUser } from '@/lib/db/models/user.model';

jest.mock('bcryptjs');
const mockBcrypt = jest.mocked(bcrypt);

function makeRepo(user: Partial<IUser> | null): IUserRepository {
  return {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(null),
    count: jest.fn(),
    create: jest.fn(),
  };
}

describe('authorizeCredentials', () => {
  it('returns null when user is not found', async () => {
    const repo = makeRepo(null);
    const result = await authorizeCredentials('a@b.com', 'pass', repo);
    expect(result).toBeNull();
  });

  it('returns null when password is wrong', async () => {
    const repo = makeRepo({ passwordHash: 'hash' } as IUser);
    mockBcrypt.compare.mockResolvedValue(false as never);

    const result = await authorizeCredentials('a@b.com', 'wrong', repo);
    expect(result).toBeNull();
  });

  it('returns user object when credentials are valid', async () => {
    const mockUser = {
      _id: { toString: () => 'user-id' },
      name: 'Alice',
      email: 'alice@test.com',
      passwordHash: 'hash',
      role: 'owner',
      trainerId: null,
    } as unknown as IUser;

    const repo = makeRepo(mockUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await authorizeCredentials('alice@test.com', 'pass', repo);

    expect(result).toEqual({
      id: 'user-id',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'owner',
      trainerId: null,
    });
  });
});
