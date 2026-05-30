import mongoose from 'mongoose';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';

jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    updateOne: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PersonalBestModel);

describe('MongoPersonalBestRepository — findRecentByMemberIds', () => {
  let repo: MongoPersonalBestRepository;
  beforeEach(() => { repo = new MongoPersonalBestRepository(); jest.clearAllMocks(); });

  it('queries by memberIds, sorts by achievedAt desc, applies limit', async () => {
    const chainMock = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    mockModel.find.mockReturnValue(chainMock as never);
    const ids = [new mongoose.Types.ObjectId().toString()];
    await repo.findRecentByMemberIds(ids, 5);
    expect(mockModel.find).toHaveBeenCalledWith({
      memberId: { $in: expect.arrayContaining([expect.any(mongoose.Types.ObjectId)]) },
    });
    expect(chainMock.sort).toHaveBeenCalledWith({ achievedAt: -1 });
    expect(chainMock.limit).toHaveBeenCalledWith(5);
  });
});
