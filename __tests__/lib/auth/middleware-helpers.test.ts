import { getRedirectForRole } from '@/lib/auth/middleware-helpers';

describe('getRedirectForRole', () => {
  it('returns null when owner accesses owner pages', () => {
    expect(getRedirectForRole('owner', '/owner')).toBeNull();
  });

  it('returns null when owner accesses trainer pages', () => {
    expect(getRedirectForRole('owner', '/trainer/members')).toBeNull();
  });

  it('returns null when trainer accesses member pages', () => {
    expect(getRedirectForRole('trainer', '/member/plan')).toBeNull();
  });

  it('returns trainer redirect when trainer accesses owner pages', () => {
    expect(getRedirectForRole('trainer', '/owner')).toBe('/trainer/members');
  });

  it('returns member redirect when member accesses trainer pages', () => {
    expect(getRedirectForRole('member', '/trainer')).toBe('/member/plan');
  });

  it('returns null when member accesses member pages', () => {
    expect(getRedirectForRole('member', '/member')).toBeNull();
  });
});
