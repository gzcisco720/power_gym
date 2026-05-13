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
      sex: 'female',
      dateOfBirth: new Date('1995-06-15'),
      height: 165,
      fitnessGoal: 'lose_fat',
      fitnessLevel: 'intermediate',
      mobile: '13800138000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('rejects invalid fitnessGoal', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
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
      bio: 'NSCA-CPT certified, 5 years experience',
      specializations: ['strength', 'rehabilitation'],
      certifications: ['NSCA-CPT'],
      mobile: '13900139000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('accepts valid owner profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      gymInfo: { name: 'Power Gym Beijing', address: null, phone: null, email: null, website: null, hours: null, description: null },
      mobile: '01082345678',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
