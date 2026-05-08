jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

import { auth } from '@/lib/auth/auth';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';

const mockAuth = jest.mocked(auth);

describe('requireSelfTrackingRole', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 response when no session', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 403 response when role is member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns ok with userId for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'owner' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u1');
      expect(result.role).toBe('owner');
    }
  });

  it('returns ok with userId for trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u2', role: 'trainer' } } as never);
    const result = await requireSelfTrackingRole();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('u2');
      expect(result.role).toBe('trainer');
    }
  });
});
