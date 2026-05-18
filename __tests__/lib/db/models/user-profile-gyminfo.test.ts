/** @jest-environment node */

describe('GymInfoSchema branding fields', () => {
  it('accepts and stores logoUrl and loginLogoUrl values', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '000000000000000000000001',
      gymInfo: { name: 'Test Gym', logoUrl: 'https://cdn.example.com/logo.png', loginLogoUrl: 'https://cdn.example.com/login-logo.png' },
    });
    expect(doc.gymInfo?.logoUrl).toBe('https://cdn.example.com/logo.png');
    expect(doc.gymInfo?.loginLogoUrl).toBe('https://cdn.example.com/login-logo.png');
  });

  it('defaults logoUrl and loginLogoUrl to null', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      gymInfo: { name: 'Test Gym' },
    });
    expect(doc.gymInfo?.logoUrl).toBeNull();
    expect(doc.gymInfo?.loginLogoUrl).toBeNull();
  });
});
