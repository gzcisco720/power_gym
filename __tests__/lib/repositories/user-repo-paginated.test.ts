import mongoose from 'mongoose';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { UserModel } from '@/lib/db/models/user.model';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(UserModel);

describe('MongoUserRepository — findAllMembersPaginated', () => {
  let repo: MongoUserRepository;
  beforeEach(() => {
    repo = new MongoUserRepository();
    jest.clearAllMocks();
  });

  it('returns members and total for page 1', async () => {
    const chainMock = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'm1' }]),
    };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(15 as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    const result = await repo.findAllMembersPaginated(trainerId, 1, 10);
    expect(chainMock.skip).toHaveBeenCalledWith(0);
    expect(chainMock.limit).toHaveBeenCalledWith(10);
    expect(result.total).toBe(15);
  });

  it('skips correct number of items for page 2', async () => {
    const chainMock = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(15 as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    await repo.findAllMembersPaginated(trainerId, 2, 10);
    expect(chainMock.skip).toHaveBeenCalledWith(10);
  });
});
