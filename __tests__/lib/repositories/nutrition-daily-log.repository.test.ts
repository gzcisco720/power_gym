import mongoose from 'mongoose';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { NutritionDailyLogModel } from '@/lib/db/models/nutrition-daily-log.model';

jest.mock('@/lib/db/models/nutrition-daily-log.model', () => ({
  NutritionDailyLogModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionDailyLogModel);

describe('MongoNutritionDailyLogRepository', () => {
  let repo: MongoNutritionDailyLogRepository;

  beforeEach(() => {
    repo = new MongoNutritionDailyLogRepository();
    jest.clearAllMocks();
  });

  it('findByDate queries by memberId+date', async () => {
    mockModel.findOne.mockResolvedValue({ _id: 'log1' } as never);
    const memberId = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByDate(memberId, '2026-05-06');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      date: '2026-05-06',
    });
    expect(result).toEqual({ _id: 'log1' });
  });

  it('findByDate returns null when no log', async () => {
    mockModel.findOne.mockResolvedValue(null as never);
    const result = await repo.findByDate(new mongoose.Types.ObjectId().toString(), '2026-05-06');
    expect(result).toBeNull();
  });

  it('upsert creates or updates log', async () => {
    const upserted = { _id: 'log1', dayCompleted: false };
    mockModel.findOneAndUpdate.mockResolvedValue(upserted as never);
    const memberId = new mongoose.Types.ObjectId().toString();
    const planId = new mongoose.Types.ObjectId().toString();
    const result = await repo.upsert(memberId, '2026-05-06', {
      planId,
      dayTypeName: 'Training Day',
      meals: [],
      dayCompleted: false,
    });
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), date: '2026-05-06' },
      {
        $set: {
          planId: expect.any(mongoose.Types.ObjectId),
          dayTypeName: 'Training Day',
          meals: [],
          dayCompleted: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    expect(result).toEqual(upserted);
  });
});
