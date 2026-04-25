import { getRedirectForRole } from '@/lib/auth/middleware-helpers';

describe('getRedirectForRole', () => {
  it('returns null when owner accesses owner dashboard', () => {
    expect(getRedirectForRole('owner', '/dashboard/owner')).toBeNull();
  });

  it('returns null when owner accesses trainer dashboard', () => {
    expect(getRedirectForRole('owner', '/dashboard/trainer/clients')).toBeNull();
  });

  it('returns null when trainer accesses member dashboard', () => {
    expect(getRedirectForRole('trainer', '/dashboard/member/plan')).toBeNull();
  });

  it('returns member redirect when trainer accesses owner dashboard', () => {
    expect(getRedirectForRole('trainer', '/dashboard/owner')).toBe('/dashboard/trainer/members');
  });

  it('returns member redirect when member accesses trainer dashboard', () => {
    expect(getRedirectForRole('member', '/dashboard/trainer')).toBe('/dashboard/member/plan');
  });

  it('returns null when member accesses member dashboard', () => {
    expect(getRedirectForRole('member', '/dashboard/member')).toBeNull();
  });
});
