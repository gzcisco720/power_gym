import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();

jest.mock('bcryptjs', () => ({
  compare: (...args: unknown[]): unknown => mockBcryptCompare(...args),
  hash: (...args: unknown[]): unknown => mockBcryptHash(...args),
}));

import { AccountService } from './account.service';
import type { IUser } from '../database/models/user.model';
import type { IUserProfile } from '../database/models/user-profile.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  return {
    _id: { toString: () => 'user1' },
    firstName: 'Alice',
    lastName: 'Smith',
    name: 'Alice Smith',
    email: 'alice@example.com',
    passwordHash: 'hashed-pw',
    role: 'member' as const,
    trainerId: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as IUser;
}

function makeProfile(
  overrides: Partial<Record<string, unknown>> = {},
): IUserProfile {
  return {
    _id: { toString: () => 'profile1' },
    userId: { toString: () => 'user1' },
    mobile: null,
    address: null,
    ...overrides,
  } as unknown as IUserProfile;
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    profileRepo?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    updatePassword: jest.fn().mockResolvedValue(undefined),
    updateEmail: jest.fn().mockResolvedValue(undefined),
  };
  const profileRepo = overrides.profileRepo ?? {
    findByUserId: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue(makeProfile()),
  };

  const service = new AccountService(userRepo as never, profileRepo as never);
  return { service, userRepo, profileRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── changePassword ────────────────────────────────────────────────────────────

describe('AccountService > changePassword', () => {
  it('throws NotFoundException when user not found', async () => {
    const { service } = makeService();

    await expect(
      service.changePassword('user1', {
        currentPassword: 'old',
        newPassword: 'new',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when current password is incorrect', async () => {
    const user = makeUser();
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(false);

    await expect(
      service.changePassword('user1', {
        currentPassword: 'wrong',
        newPassword: 'new',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('hashes the new password and calls updatePassword on success', async () => {
    const user = makeUser();
    const { service, userRepo } = makeService();
    userRepo.findById.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue('new-hashed');

    const result = await service.changePassword('user1', {
      currentPassword: 'old',
      newPassword: 'new',
    });

    expect(userRepo.updatePassword).toHaveBeenCalledWith('user1', 'new-hashed');
    expect(result).toEqual({ success: true });
  });
});

// ── changeEmail ───────────────────────────────────────────────────────────────

describe('AccountService > changeEmail', () => {
  it('throws ConflictException when normalized email belongs to another user', async () => {
    const otherUser = makeUser({ _id: { toString: () => 'other-user' } });
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(otherUser);

    await expect(
      service.changeEmail('user1', 'ALICE@EXAMPLE.COM'),
    ).rejects.toThrow(ConflictException);
  });

  it('calls updateEmail with the lowercased/trimmed email on success', async () => {
    const { service, userRepo } = makeService();
    // no conflict — no existing user with that email
    userRepo.findByEmail.mockResolvedValue(null);

    const result = await service.changeEmail('user1', '  Alice@Example.COM  ');

    expect(userRepo.updateEmail).toHaveBeenCalledWith(
      'user1',
      'alice@example.com',
    );
    expect(result).toEqual({ success: true });
  });
});

// ── getProfile ────────────────────────────────────────────────────────────────

describe('AccountService > getProfile', () => {
  it('delegates to profileRepo.findByUserId', async () => {
    const profile = makeProfile();
    const { service, profileRepo } = makeService();
    profileRepo.findByUserId.mockResolvedValue(profile);

    const result = await service.getProfile('user1');

    expect(profileRepo.findByUserId).toHaveBeenCalledWith('user1');
    expect(result).toBe(profile);
  });
});

// ── updateProfile ─────────────────────────────────────────────────────────────

describe('AccountService > updateProfile', () => {
  it('delegates to profileRepo.upsert', async () => {
    const profile = makeProfile({ mobile: '1234567890' });
    const { service, profileRepo } = makeService();
    profileRepo.upsert.mockResolvedValue(profile);

    const data = { mobile: '1234567890' };
    const result = await service.updateProfile('user1', data);

    expect(profileRepo.upsert).toHaveBeenCalledWith('user1', data);
    expect(result).toBe(profile);
  });
});
