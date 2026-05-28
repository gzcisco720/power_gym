// __tests__/lib/repositories/personal-best.repository.test.ts
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

describe('MongoPersonalBestRepository', () => {
  let repo: MongoPersonalBestRepository;

  beforeEach(() => {
    repo = new MongoPersonalBestRepository();
    jest.clearAllMocks();
  });

  describe('findByMember', () => {
    it('queries by memberId', async () => {
      mockModel.find.mockResolvedValue([] as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findByMember(id);
      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
    });
  });

  describe('upsertIfBetter', () => {
    const base = {
      memberId: new mongoose.Types.ObjectId().toString(),
      exerciseId: new mongoose.Types.ObjectId().toString(),
      exerciseName: 'Bench Press',
      sessionId: new mongoose.Types.ObjectId().toString(),
    };

    it('calls updateOne with conditional $or filter', async () => {
      mockModel.updateOne.mockResolvedValue({ matchedCount: 0 } as never);

      // weight=80, reps=8 → 1RM ≈ 101.3
      await repo.upsertIfBetter({ ...base, weight: 80, reps: 8 });

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: expect.any(mongoose.Types.ObjectId),
          exerciseId: expect.any(mongoose.Types.ObjectId),
          $or: expect.arrayContaining([{ estimatedOneRM: { $lt: expect.any(Number) } }]),
        }),
        expect.anything(),
        { upsert: true },
      );
    });

    it('passes correct estimatedOneRM in $set', async () => {
      mockModel.updateOne.mockResolvedValue({} as never);

      // weight=100, reps=10 → 1RM = 100*(1+10/30) ≈ 133.3
      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      const call = mockModel.updateOne.mock.calls[0];
      const update = call[1] as { $set: Record<string, unknown> };
      expect(update.$set.estimatedOneRM).toBeCloseTo(133.33, 2);
    });
  });
});
