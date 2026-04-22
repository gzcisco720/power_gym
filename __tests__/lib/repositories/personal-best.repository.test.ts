// __tests__/lib/repositories/personal-best.repository.test.ts
import mongoose from 'mongoose';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';

jest.mock('@/lib/db/models/personal-best.model', () => ({
  PersonalBestModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
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

    it('does not upsert when new 1RM is lower than existing', async () => {
      mockModel.findOne.mockResolvedValue({ estimatedOneRM: 150 } as never);

      // weight=80, reps=8 → 1RM = 80*(1+8/30) ≈ 101.3
      await repo.upsertIfBetter({ ...base, weight: 80, reps: 8 });

      expect(mockModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('upserts when new 1RM exceeds existing', async () => {
      mockModel.findOne.mockResolvedValue({ estimatedOneRM: 100 } as never);

      // weight=100, reps=10 → 1RM = 100*(1+10/30) ≈ 133.3
      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('upserts when no existing record (null)', async () => {
      mockModel.findOne.mockResolvedValue(null as never);

      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('passes correct estimatedOneRM when upserting', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);

      await repo.upsertIfBetter({ ...base, weight: 100, reps: 10 });

      const call = mockModel.findOneAndUpdate.mock.calls[0];
      const update = call[1] as Record<string, unknown>;
      expect((update as { estimatedOneRM: number }).estimatedOneRM).toBeCloseTo(133.33, 2);
    });
  });
});
