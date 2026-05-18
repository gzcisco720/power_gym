/** @jest-environment node */

describe('GymInfoSchema branding fields', () => {
  it('has logoUrl and loginBgUrl paths with null defaults', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const gymInfoPaths = (UserProfileModel.schema.path('gymInfo') as any).schema.paths;
    expect(gymInfoPaths).toHaveProperty('logoUrl');
    expect(gymInfoPaths).toHaveProperty('loginBgUrl');
  });

  it('defaults logoUrl and loginBgUrl to null', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      gymInfo: { name: 'Test Gym' },
    });
    expect(doc.gymInfo?.logoUrl).toBeNull();
    expect(doc.gymInfo?.loginBgUrl).toBeNull();
  });
});
