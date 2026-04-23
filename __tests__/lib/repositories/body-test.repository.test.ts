import mongoose from 'mongoose';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestModel } from '@/lib/db/models/body-test.model';

jest.mock('@/lib/db/models/body-test.model', () => ({
  BodyTestModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    deleteOne: jest.fn(),
  }),
}));

const mockModel = jest.mocked(BodyTestModel);

function makeTestData(memberId: string, trainerId: string, date: Date) {
  return {
    memberId,
    trainerId,
    date,
    age: 30,
    sex: 'male' as const,
    weight: 80,
    protocol: 'other' as const,
    bodyFatPct: 15,
    leanMassKg: 68,
    fatMassKg: 12,
    targetWeight: null,
    targetBodyFatPct: null,
  };
}

describe('MongoBodyTestRepository', () => {
  let repo: MongoBodyTestRepository;
  const memberId = new mongoose.Types.ObjectId().toString();
  const trainerId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repo = new MongoBodyTestRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves a body test and returns it', async () => {
      const data = makeTestData(memberId, trainerId, new Date());
      const saved = { _id: 'test1', ...data };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (BodyTestModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create(data);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
      expect(result.bodyFatPct).toBe(15);
    });
  });

  describe('findByMember', () => {
    it('returns tests in descending date order', async () => {
      const earlier = new Date('2026-01-01');
      const later = new Date('2026-03-01');
      const tests = [
        { _id: 't2', date: later, ...makeTestData(memberId, trainerId, later) },
        { _id: 't1', date: earlier, ...makeTestData(memberId, trainerId, earlier) },
      ];
      const sortMock = jest.fn().mockResolvedValue(tests);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const results = await repo.findByMember(memberId);

      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
      expect(results).toEqual(tests);
      expect(results[0].date.getTime()).toBeGreaterThan(results[1].date.getTime());
    });

    it('returns empty array when member has no tests', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const otherId = new mongoose.Types.ObjectId().toString();
      const results = await repo.findByMember(otherId);

      expect(results).toEqual([]);
    });
  });

  describe('deleteById', () => {
    it('deletes a test that belongs to trainer', async () => {
      const testId = new mongoose.Types.ObjectId().toString();
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as never);

      await repo.deleteById(testId, trainerId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        trainerId: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('does not delete a test owned by a different trainer', async () => {
      const testId = new mongoose.Types.ObjectId().toString();
      const otherTrainerId = new mongoose.Types.ObjectId().toString();
      mockModel.deleteOne.mockResolvedValue({ deletedCount: 0 } as never);

      await repo.deleteById(testId, otherTrainerId);

      expect(mockModel.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        trainerId: expect.any(mongoose.Types.ObjectId),
      });
    });
  });
});
