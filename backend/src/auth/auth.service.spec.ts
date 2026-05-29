import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

// Mock bcryptjs before importing AuthService (which imports bcryptjs at module load)
const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();

jest.mock('bcryptjs', () => ({
  compare: (...args: unknown[]): unknown => mockBcryptCompare(...args),
  hash: (...args: unknown[]): unknown => mockBcryptHash(...args),
}));

import { AuthService } from './auth.service';
import type { IUser } from '../database/models/user.model';

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
    trainerId: { toString: () => 'trainer1' },
    createdAt: new Date(),
    ...overrides,
  } as unknown as IUser;
}

function makeInvite(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'inv1' },
    token: 'invite-token',
    role: 'member' as const,
    invitedBy: { toString: () => 'trainer1' },
    recipientEmail: 'alice@example.com',
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null,
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  };
}

function makeResetRecord(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'reset1' },
    userId: { toString: () => 'user1' },
    tokenHash: 'hashed-reset',
    usedAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  };
}

function makeService(
  overrides: {
    userRepo?: Record<string, jest.Mock>;
    inviteRepo?: Record<string, jest.Mock>;
    refreshTokenRepo?: Record<string, jest.Mock>;
    resetTokenRepo?: Record<string, jest.Mock>;
    jwtService?: Record<string, jest.Mock>;
    config?: Record<string, jest.Mock>;
    emailService?: Record<string, jest.Mock>;
  } = {},
) {
  const userRepo = overrides.userRepo ?? {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue(makeUser()),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  };
  const inviteRepo = overrides.inviteRepo ?? {
    findByToken: jest.fn().mockResolvedValue(null),
    markUsed: jest.fn().mockResolvedValue(undefined),
  };
  const refreshTokenRepo = overrides.refreshTokenRepo ?? {
    create: jest.fn().mockResolvedValue(undefined),
    revokeByToken: jest.fn().mockResolvedValue(undefined),
  };
  const resetTokenRepo = overrides.resetTokenRepo ?? {
    create: jest.fn().mockResolvedValue(undefined),
    findValidByToken: jest.fn().mockResolvedValue(null),
    markUsed: jest.fn().mockResolvedValue(undefined),
  };
  const jwtService = overrides.jwtService ?? {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };
  const config = overrides.config ?? {
    get: jest.fn().mockReturnValue('test-value'),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };
  const emailService = overrides.emailService ?? {
    sendInvite: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    userRepo as never,
    inviteRepo as never,
    refreshTokenRepo as never,
    resetTokenRepo as never,
    jwtService as never,
    config as never,
    emailService as never,
  );

  return {
    service,
    userRepo,
    inviteRepo,
    refreshTokenRepo,
    resetTokenRepo,
    jwtService,
    config,
    emailService,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── validateUser ──────────────────────────────────────────────────────────────

describe('AuthService > validateUser', () => {
  it('returns the user when bcrypt.compare resolves true', async () => {
    const user = makeUser();
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(true);

    const result = await service.validateUser('alice@example.com', 'pw');
    expect(result).toBe(user);
  });

  it('throws UnauthorizedException when email not found', async () => {
    const { service } = makeService();

    await expect(
      service.validateUser('unknown@example.com', 'pw'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when password mismatch', async () => {
    const user = makeUser();
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(false);

    await expect(
      service.validateUser('alice@example.com', 'wrong'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('AuthService > login', () => {
  it('returns access_token, refresh_token, and user payload on valid credentials', async () => {
    const user = makeUser({ role: 'owner' });
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(user);
    mockBcryptCompare.mockResolvedValue(true);

    const result = await service.login({
      email: 'alice@example.com',
      password: 'pw',
    });

    expect(result).toMatchObject({
      access_token: expect.any(String) as jest.AsymmetricMatcher,
      refresh_token: expect.any(String) as jest.AsymmetricMatcher,
      user: {
        id: 'user1',
        email: 'alice@example.com',
        role: 'owner',
        name: 'Alice Smith',
      },
    });
  });
});

// ── register ──────────────────────────────────────────────────────────────────

describe('AuthService > register', () => {
  it('throws BadRequestException when email already registered', async () => {
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(makeUser());

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'pw',
        firstName: 'Alice',
        lastName: 'Smith',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates an owner with role 'owner' when no token and userRepo.count() === 0", async () => {
    const ownerUser = makeUser({ role: 'owner' });
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.count.mockResolvedValue(0);
    userRepo.create.mockResolvedValue(ownerUser);
    mockBcryptHash.mockResolvedValue('hashed');

    const result = await service.register({
      email: 'owner@example.com',
      password: 'pw',
      firstName: 'Owner',
      lastName: 'User',
    });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'owner' }),
    );
    expect(result.user.role).toBe('owner');
  });

  it('throws ForbiddenException when no token and userRepo.count() > 0', async () => {
    const { service, userRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.count.mockResolvedValue(1);

    await expect(
      service.register({
        email: 'new@example.com',
        password: 'pw',
        firstName: 'New',
        lastName: 'User',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when invite token is not found', async () => {
    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    inviteRepo.findByToken.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'a@example.com',
        password: 'pw',
        firstName: 'A',
        lastName: 'B',
        token: 'bad-token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when invite token is already used', async () => {
    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    inviteRepo.findByToken.mockResolvedValue(
      makeInvite({ usedAt: new Date() }),
    );

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'pw',
        firstName: 'A',
        lastName: 'B',
        token: 'invite-token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when invite token is expired', async () => {
    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    inviteRepo.findByToken.mockResolvedValue(
      makeInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'pw',
        firstName: 'A',
        lastName: 'B',
        token: 'invite-token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when email does not match invite', async () => {
    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    inviteRepo.findByToken.mockResolvedValue(
      makeInvite({ recipientEmail: 'other@example.com' }),
    );

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'pw',
        firstName: 'A',
        lastName: 'B',
        token: 'invite-token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sets trainerId from invite and calls inviteRepo.markUsed for a member invite', async () => {
    const memberUser = makeUser({ role: 'member' });
    const invite = makeInvite({
      role: 'member',
      trainerId: { toString: () => 'trainer1' },
    });

    const { service, userRepo, inviteRepo } = makeService();
    userRepo.findByEmail.mockResolvedValue(null);
    inviteRepo.findByToken.mockResolvedValue(invite);
    userRepo.create.mockResolvedValue(memberUser);
    mockBcryptHash.mockResolvedValue('hashed');

    await service.register({
      email: 'alice@example.com',
      password: 'pw',
      firstName: 'Alice',
      lastName: 'Smith',
      token: 'invite-token',
    });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'member', trainerId: 'trainer1' }),
    );
    expect(inviteRepo.markUsed).toHaveBeenCalledWith('invite-token');
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────

describe('AuthService > refresh', () => {
  it('throws UnauthorizedException when user not found', async () => {
    const { service } = makeService();

    await expect(service.refresh('user1', 'old-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes old token and creates a new refresh token (rotation)', async () => {
    const user = makeUser();
    const { service, userRepo, refreshTokenRepo } = makeService();
    userRepo.findById.mockResolvedValue(user);

    const result = await service.refresh('user1', 'old-token');

    expect(refreshTokenRepo.revokeByToken).toHaveBeenCalledWith('old-token');
    expect(refreshTokenRepo.create).toHaveBeenCalledWith(
      'user1',
      expect.any(String),
      expect.any(Date),
    );
    expect(result).toMatchObject({
      access_token: expect.any(String) as jest.AsymmetricMatcher,
      refresh_token: expect.any(String) as jest.AsymmetricMatcher,
    });
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe('AuthService > logout', () => {
  it('calls refreshTokenRepo.revokeByToken and returns { success: true }', async () => {
    const { service, refreshTokenRepo } = makeService();

    const result = await service.logout('some-refresh-token');

    expect(refreshTokenRepo.revokeByToken).toHaveBeenCalledWith(
      'some-refresh-token',
    );
    expect(result).toEqual({ success: true });
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────

describe('AuthService > forgotPassword', () => {
  it('returns { success: true } and does NOT create a reset token when email unknown', async () => {
    const { service, resetTokenRepo } = makeService();

    const result = await service.forgotPassword('unknown@example.com');

    expect(result).toEqual({ success: true });
    expect(resetTokenRepo.create).not.toHaveBeenCalled();
  });

  it('creates a reset token and calls emailService.sendPasswordReset when user exists', async () => {
    const user = makeUser();
    const { service, userRepo, resetTokenRepo, emailService } = makeService();
    userRepo.findByEmail.mockResolvedValue(user);

    const result = await service.forgotPassword('alice@example.com');

    expect(result).toMatchObject({ success: true });
    expect(resetTokenRepo.create).toHaveBeenCalledWith(
      'user1',
      expect.any(String),
      expect.any(Date),
    );
    // fire-and-forget — flush the microtask queue
    await Promise.resolve();
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com' }),
    );
  });

  it("includes resetToken in response when NODE_ENV !== production and AUTH_EXPOSE_RESET_TOKEN === '1'", async () => {
    const user = makeUser();
    const { service } = makeService({
      userRepo: {
        findByEmail: jest.fn().mockResolvedValue(user),
        findById: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(user),
        updatePassword: jest.fn().mockResolvedValue(undefined),
      },
      config: {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'AUTH_EXPOSE_RESET_TOKEN') return '1';
          return 'http://localhost:3000';
        }),
        getOrThrow: jest.fn().mockReturnValue('test-secret'),
      },
    });

    const result = await service.forgotPassword('alice@example.com');

    expect(result).toMatchObject({
      success: true,
      resetToken: expect.any(String) as jest.AsymmetricMatcher,
    });
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────

describe('AuthService > resetPassword', () => {
  it('throws BadRequestException for an invalid/expired token', async () => {
    const { service } = makeService();

    await expect(service.resetPassword('bad-token', 'newpw')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updates password hash and marks token used on a valid token', async () => {
    const record = makeResetRecord();
    const { service, resetTokenRepo, userRepo } = makeService();
    resetTokenRepo.findValidByToken.mockResolvedValue(record);
    mockBcryptHash.mockResolvedValue('new-hashed');

    const result = await service.resetPassword('valid-token', 'newpw');

    expect(userRepo.updatePassword).toHaveBeenCalledWith('user1', 'new-hashed');
    expect(resetTokenRepo.markUsed).toHaveBeenCalledWith('reset1');
    expect(result).toEqual({ success: true });
  });
});
