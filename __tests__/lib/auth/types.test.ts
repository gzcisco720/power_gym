import type { UserRole } from '@/types/auth';

describe('UserRole', () => {
  it('accepts valid roles', () => {
    const roles: UserRole[] = ['owner', 'trainer', 'member'];
    expect(roles).toHaveLength(3);
  });
});
