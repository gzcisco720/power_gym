import { getGymBranding } from '@/lib/db/queries/gym-branding';

jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

let mockUserFindOneResult: unknown = null;
jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: {
    findOne: jest.fn(() => ({
      lean: jest.fn(() => mockUserFindOneResult),
    })),
  },
}));

let mockProfileFindOneResult: unknown = null;
jest.mock('@/lib/db/models/user-profile.model', () => ({
  UserProfileModel: {
    findOne: jest.fn(() => ({
      lean: jest.fn(() => mockProfileFindOneResult),
    })),
  },
}));

describe('getGymBranding', () => {
  it('returns gymInfo branding fields when owner has a profile', async () => {
    mockUserFindOneResult = { _id: 'owner-id' };
    mockProfileFindOneResult = {
      gymInfo: {
        name: 'Iron Club',
        logoUrl: 'https://cdn.example.com/logo.png',
        loginLogoUrl: 'https://cdn.example.com/login-logo.png',
      },
    };

    const result = await getGymBranding();

    expect(result).toEqual({
      name: 'Iron Club',
      logoUrl: 'https://cdn.example.com/logo.png',
      loginLogoUrl: 'https://cdn.example.com/login-logo.png',
    });
  });

  it('returns null fields when no owner profile exists', async () => {
    mockUserFindOneResult = null;

    const result = await getGymBranding();

    expect(result).toEqual({ name: null, logoUrl: null, loginLogoUrl: null });
  });

  it('returns null fields when gymInfo is null', async () => {
    mockUserFindOneResult = { _id: 'owner-id' };
    mockProfileFindOneResult = { gymInfo: null };

    const result = await getGymBranding();

    expect(result).toEqual({ name: null, logoUrl: null, loginLogoUrl: null });
  });
});
