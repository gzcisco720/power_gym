import 'reflect-metadata';
import { AuthController } from './auth.controller';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAuthService(overrides: Record<string, jest.Mock> = {}) {
  return {
    login: jest.fn().mockResolvedValue({
      access_token: 'at-token',
      refresh_token: 'rt-token',
      user: { id: 'u1', email: 'a@example.com', role: 'member', name: 'Alice' },
    }),
    register: jest.fn().mockResolvedValue({
      access_token: 'at-token',
      refresh_token: 'rt-token',
      user: { id: 'u1', email: 'a@example.com', role: 'member', name: 'Alice' },
    }),
    refresh: jest.fn().mockResolvedValue({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      user: { id: 'u1', email: 'a@example.com', role: 'member', name: 'Alice' },
    }),
    logout: jest.fn().mockResolvedValue({ success: true }),
    forgotPassword: jest.fn().mockResolvedValue({ success: true }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

function makeRes() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

function makeReq(cookieValue?: string) {
  return {
    cookies: cookieValue !== undefined ? { refresh_token: cookieValue } : {},
  };
}

function makeController(authServiceOverrides?: Record<string, jest.Mock>) {
  const authService = makeAuthService(authServiceOverrides);
  const controller = new AuthController(authService as never);
  return { controller, authService };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('AuthController > login', () => {
  it('sets refresh_token as an httpOnly cookie and omits refresh_token from the JSON body', async () => {
    const { controller, authService } = makeController();
    const res = makeRes();
    const dto = { email: 'a@example.com', password: 'pw' };

    const result = await controller.login(dto, res as never);

    // Cookie set with httpOnly
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'rt-token',
      expect.objectContaining({ httpOnly: true }),
    );

    // access_token and user returned
    expect(result).toMatchObject({
      access_token: 'at-token',
      user: expect.objectContaining({
        email: 'a@example.com',
      }) as jest.AsymmetricMatcher,
    });

    // refresh_token NOT in body
    expect(result).not.toHaveProperty('refresh_token');

    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});

// ── register ──────────────────────────────────────────────────────────────────

describe('AuthController > register', () => {
  it('sets refresh_token as an httpOnly cookie and omits refresh_token from the JSON body', async () => {
    const { controller, authService } = makeController();
    const res = makeRes();
    const dto = { email: 'a@example.com', password: 'pw', name: 'Alice', role: 'member' as const };

    const result = await controller.register(dto as never, res as never);

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'rt-token',
      expect.objectContaining({ httpOnly: true }),
    );

    expect(result).toMatchObject({
      access_token: 'at-token',
      user: expect.objectContaining({ email: 'a@example.com' }) as jest.AsymmetricMatcher,
    });

    expect(result).not.toHaveProperty('refresh_token');

    expect(authService.register).toHaveBeenCalledWith(dto);
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────

describe('AuthController > refresh', () => {
  it('reads refresh_token from the cookie, sets a fresh httpOnly cookie, and returns access_token in body', async () => {
    const { controller, authService } = makeController();
    const res = makeRes();
    const req = makeReq('rt-token');
    const user = {
      userId: 'u1',
      email: 'a@example.com',
      role: 'member' as const,
      refreshToken: 'rt-token',
    };

    const result = await controller.refresh(user, res as never);

    // Calls service with userId and validated refreshToken from user
    expect(authService.refresh).toHaveBeenCalledWith('u1', 'rt-token');

    // Sets fresh cookie
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-rt',
      expect.objectContaining({ httpOnly: true }),
    );

    // Returns access_token in body
    expect(result).toMatchObject({ access_token: 'new-at' });

    // refresh_token NOT in body
    expect(result).not.toHaveProperty('refresh_token');
  });
});

// ── logout ────────────────────────────────────────────────────────────────────

describe('AuthController > logout', () => {
  it('revokes the refresh token and clears the cookie (Max-Age=0)', async () => {
    const { controller, authService } = makeController();
    const res = makeRes();
    const req = makeReq('rt-token');
    const user = {
      userId: 'u1',
      email: 'a@example.com',
      role: 'member' as const,
    };

    const result = await controller.logout(user, req as never, res as never);

    // Reads token from cookie and revokes it
    expect(authService.logout).toHaveBeenCalledWith('rt-token');

    // Clears cookie with matching options
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));

    // Returns success
    expect(result).toEqual({ success: true });
  });

  it('returns success and clears cookie when refresh_token cookie is absent', async () => {
    const { controller, authService } = makeController();
    const res = makeRes();
    const req = makeReq(); // no cookie value
    const user = { userId: 'u1', email: 'a@example.com', role: 'member' as const };

    const result = await controller.logout(user, req as never, res as never);

    expect(authService.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    expect(result).toEqual({ success: true });
  });
});
