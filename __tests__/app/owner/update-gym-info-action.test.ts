/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUpsert = jest.fn().mockResolvedValue({});

jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user1', role: 'owner' } }),
}));

jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn().mockImplementation(() => ({ upsert: mockUpsert })),
}));

import { updateGymInfoAction } from '@/app/(dashboard)/owner/settings/actions';

describe('updateGymInfoAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({});
  });

  it('persists logoUrl and loginBgUrl when provided', async () => {
    const fd = new FormData();
    fd.append('gymName', 'Iron Club');
    fd.append('logoUrl', 'https://cdn.example.com/logo.png');
    fd.append('loginBgUrl', 'https://cdn.example.com/bg.jpg');

    const result = await updateGymInfoAction({ error: '' }, fd);

    expect(result.error).toBe('');
    expect(mockUpsert).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({
        gymInfo: expect.objectContaining({
          logoUrl: 'https://cdn.example.com/logo.png',
          loginBgUrl: 'https://cdn.example.com/bg.jpg',
        }),
      }),
    );
  });

  it('stores null when branding fields are absent', async () => {
    const fd = new FormData();
    fd.append('gymName', 'Iron Club');

    await updateGymInfoAction({ error: '' }, fd);

    expect(mockUpsert).toHaveBeenCalledWith(
      'user1',
      expect.objectContaining({
        gymInfo: expect.objectContaining({ logoUrl: null, loginBgUrl: null }),
      }),
    );
  });
});
