/** @jest-environment node */

jest.mock('@/lib/db/models/user-profile.model', () => ({
  UserProfileModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { UserProfileModel } from '@/lib/db/models/user-profile.model';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

const mockFindOne = jest.mocked(UserProfileModel.findOne);
const mockFindOneAndUpdate = jest.mocked(UserProfileModel.findOneAndUpdate);

const USER_ID = '507f1f77bcf86cd799439011';

describe('MongoUserProfileRepository', () => {
  const repo = new MongoUserProfileRepository();

  beforeEach(() => jest.clearAllMocks());

  it('findByUserId returns null when no profile exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await repo.findByUserId(USER_ID);
    expect(mockFindOne).toHaveBeenCalledWith({ userId: expect.any(Object) });
    expect(result).toBeNull();
  });

  it('findByUserId returns profile when found', async () => {
    const profile = { userId: USER_ID, sex: 'female', fitnessGoal: 'lose_fat' };
    mockFindOne.mockResolvedValue(profile as never);
    const result = await repo.findByUserId(USER_ID);
    expect(result).toEqual(profile);
  });

  it('upsert calls findOneAndUpdate with upsert: true and returns updated doc', async () => {
    const updated = { userId: USER_ID, sex: 'male', height: 178 };
    mockFindOneAndUpdate.mockResolvedValue(updated as never);

    const result = await repo.upsert(USER_ID, { sex: 'male', height: 178 });

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { userId: expect.any(Object) },
      { $set: { sex: 'male', height: 178 } },
      { upsert: true, new: true },
    );
    expect(result).toEqual(updated);
  });
});
