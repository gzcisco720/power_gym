/** @jest-environment node */
jest.mock('@/lib/db/models/self-nutrition-log.model', () => ({
  SelfNutritionLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

const mockModel = jest.mocked(SelfNutritionLogModel) as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
};

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439099';
const TPL_ID = '507f1f77bcf86cd799439040';

describe('MongoSelfNutritionLogRepository', () => {
  let repo: MongoSelfNutritionLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoSelfNutritionLogRepository();
  });

  it('findByDate scopes by userId+date', async () => {
    mockModel.findOne.mockResolvedValue({ _id: 'log1' });
    const result = await repo.findByDate(USER_A, '2026-05-08');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_A),
      date: '2026-05-08',
    });
    expect(result).toEqual({ _id: 'log1' });
  });

  it('findByDate scopes by userId so user B query does not read user A data', async () => {
    mockModel.findOne.mockResolvedValue({ _id: 'log-of-A' });
    await repo.findByDate(USER_B, '2026-05-08');
    expect(mockModel.findOne).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_B),
      date: '2026-05-08',
    });
  });

  it('findByDate returns null when no log exists', async () => {
    mockModel.findOne.mockResolvedValue(null);
    const result = await repo.findByDate(USER_A, '2026-05-08');
    expect(result).toBeNull();
  });

  it('upsertByDate uses findOneAndUpdate with upsert and concrete userId', async () => {
    mockModel.findOneAndUpdate.mockResolvedValue({ _id: 'log1' });
    const data = {
      sourceTemplateId: null,
      sourceTemplateDayTypeName: null,
      dayLabel: 'Freestyle',
      meals: [],
      dayCompleted: false,
    };
    const result = await repo.upsertByDate(USER_A, '2026-05-08', data);
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: new mongoose.Types.ObjectId(USER_A), date: '2026-05-08' },
      { $set: expect.objectContaining({ dayLabel: 'Freestyle' }) },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    expect(result).toEqual({ _id: 'log1' });
  });

  it('upsertByDate converts sourceTemplateId to ObjectId when present', async () => {
    mockModel.findOneAndUpdate.mockResolvedValue({ _id: 'log1' });
    await repo.upsertByDate(USER_A, '2026-05-08', {
      sourceTemplateId: TPL_ID,
      sourceTemplateDayTypeName: 'Training Day',
      dayLabel: 'Training Day',
      meals: [],
      dayCompleted: false,
    });
    const call = mockModel.findOneAndUpdate.mock.calls[0];
    expect(call[1].$set.sourceTemplateId).toEqual(new mongoose.Types.ObjectId(TPL_ID));
  });

  it('findByUserMonth filters by date range string', async () => {
    const sortFn = jest.fn().mockResolvedValue([{ _id: 'log1' }]);
    mockModel.find.mockReturnValue({ sort: sortFn });
    await repo.findByUserMonth(USER_A, 2026, 5);
    expect(mockModel.find).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_A),
      date: { $gte: '2026-05-01', $lt: '2026-06-01' },
    });
    expect(sortFn).toHaveBeenCalledWith({ date: 1 });
  });

  it('findByUserMonth handles December rollover', async () => {
    const sortFn = jest.fn().mockResolvedValue([]);
    mockModel.find.mockReturnValue({ sort: sortFn });
    await repo.findByUserMonth(USER_A, 2026, 12);
    expect(mockModel.find).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_A),
      date: { $gte: '2026-12-01', $lt: '2027-01-01' },
    });
  });

  it('delete returns true on successful delete and scopes by userId+date', async () => {
    mockModel.findOneAndDelete.mockResolvedValue({ _id: 'log1' });
    const ok = await repo.delete(USER_A, '2026-05-08');
    expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
      userId: new mongoose.Types.ObjectId(USER_A),
      date: '2026-05-08',
    });
    expect(ok).toBe(true);
  });

  it('delete returns false when nothing matched', async () => {
    mockModel.findOneAndDelete.mockResolvedValue(null);
    const ok = await repo.delete(USER_A, '2026-05-08');
    expect(ok).toBe(false);
  });
});
