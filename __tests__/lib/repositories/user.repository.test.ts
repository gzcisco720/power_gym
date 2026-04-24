/** @jest-environment node */
import mongoose from 'mongoose';
import type { IUser } from '@/lib/db/models/user.model';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    prototype: { save: jest.fn() },
  },
}));

import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { UserModel } from '@/lib/db/models/user.model';

const mockFind = jest.mocked(UserModel.find);
const mockFindByIdAndUpdate = jest.mocked(UserModel.findByIdAndUpdate);

const TRAINER_ID = '6507f1f77bcf86cd799439aa';
const MEMBER_ID = '6507f1f77bcf86cd799439ab';
const TRAINER_ID_2 = '6507f1f77bcf86cd799439ac';

describe('MongoUserRepository extensions', () => {
  const repo = new MongoUserRepository();

  beforeEach(() => jest.clearAllMocks());

  it('findByRole returns users with given role', async () => {
    const trainers = [{ _id: TRAINER_ID, role: 'trainer' }];
    mockFind.mockResolvedValue(trainers as unknown as IUser[]);
    const result = await repo.findByRole('trainer');
    expect(mockFind).toHaveBeenCalledWith({ role: 'trainer' });
    expect(result).toEqual(trainers);
  });

  it('findByRole returns users with member role', async () => {
    const members = [{ _id: '000000000000000000000001', role: 'member' }];
    mockFind.mockResolvedValue(members as unknown as IUser[]);
    const result = await repo.findByRole('member');
    expect(mockFind).toHaveBeenCalledWith({ role: 'member' });
    expect(result).toEqual(members);
  });

  it('findAllMembers with no trainerId returns all members', async () => {
    const members = [{ _id: MEMBER_ID, role: 'member' }];
    mockFind.mockResolvedValue(members as unknown as IUser[]);
    const result = await repo.findAllMembers();
    expect(mockFind).toHaveBeenCalledWith({ role: 'member' });
    expect(result).toEqual(members);
  });

  it('findAllMembers with trainerId filters by trainerId', async () => {
    const members = [{ _id: MEMBER_ID, trainerId: TRAINER_ID }];
    mockFind.mockResolvedValue(members as unknown as IUser[]);
    const result = await repo.findAllMembers(TRAINER_ID);
    expect(mockFind).toHaveBeenCalledWith({
      role: 'member',
      trainerId: new mongoose.Types.ObjectId(TRAINER_ID),
    });
    expect(result).toEqual(members);
  });

  it('updateTrainerId calls findByIdAndUpdate with new trainerId', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    await repo.updateTrainerId(MEMBER_ID, TRAINER_ID_2);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(MEMBER_ID, {
      $set: { trainerId: new mongoose.Types.ObjectId(TRAINER_ID_2) },
    });
  });

  it('updateTrainerId with null clears trainerId', async () => {
    mockFindByIdAndUpdate.mockResolvedValue(null);
    await repo.updateTrainerId(MEMBER_ID, null);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(MEMBER_ID, {
      $set: { trainerId: null },
    });
  });
});
