/** @jest-environment node */

describe('UserProfileModel schema', () => {
  it('requires userId field', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({});
    const err = doc.validateSync();
    expect(err?.errors['userId']).toBeDefined();
  });

  it('accepts valid member profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'member',
      sex: 'female',
      dateOfBirth: new Date('1995-06-15'),
      height: 165,
      fitnessGoal: 'lose_fat',
      fitnessLevel: 'intermediate',
      phone: '13800138000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('rejects invalid fitnessGoal', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'member',
      fitnessGoal: 'get_rich',
    });
    const err = doc.validateSync();
    expect(err?.errors['fitnessGoal']).toBeDefined();
  });

  it('rejects invalid fitnessLevel', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      fitnessLevel: 'elite',
    });
    const err = doc.validateSync();
    expect(err?.errors['fitnessLevel']).toBeDefined();
  });

  it('accepts valid trainer profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'trainer',
      bio: 'NSCA-CPT certified, 5 years experience',
      specializations: ['strength', 'rehabilitation'],
      phone: '13900139000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('accepts valid owner profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'owner',
      gymName: 'Power Gym Beijing',
      phone: '01082345678',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
