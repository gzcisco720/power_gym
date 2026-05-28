import mongoose from 'mongoose';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';

jest.mock('@/lib/db/models/member-nutrition-plan.model', () => ({
  MemberNutritionPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(MemberNutritionPlanModel);

describe('MongoMemberNutritionPlanRepository', () => {
  let repo: MongoMemberNutritionPlanRepository;

  beforeEach(() => {
    repo = new MongoMemberNutritionPlanRepository();
    jest.clearAllMocks();
  });

  it('findActive queries by memberId and isActive:true', async () => {
    const plan = { _id: 'np1', name: '减脂计划' };
    mockModel.findOne.mockResolvedValue(plan as never);
    const result = await repo.findActive(new mongoose.Types.ObjectId().toString());
    expect(mockModel.findOne).toHaveBeenCalledWith({
      memberId: expect.any(mongoose.Types.ObjectId),
      isActive: true,
    });
    expect(result).toEqual(plan);
  });

  it('findAllByMember sorts by assignedAt desc', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ _id: 'np2' }, { _id: 'np1' }]);
    mockModel.find.mockReturnValue({ sort: sortMock } as never);
    const result = await repo.findAllByMember(new mongoose.Types.ObjectId().toString());
    expect(mockModel.find).toHaveBeenCalledWith({ memberId: expect.any(mongoose.Types.ObjectId) });
    expect(sortMock).toHaveBeenCalledWith({ assignedAt: -1 });
    expect(result).toHaveLength(2);
  });

  it('deactivateAll updates all to isActive:false with deactivatedAt', async () => {
    mockModel.updateMany.mockResolvedValue({} as never);
    await repo.deactivateAll(new mongoose.Types.ObjectId().toString());
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), isActive: true },
      { $set: { isActive: false, deactivatedAt: expect.any(Date) } },
    );
  });

  it('create with assignedById and optional templateId=null', async () => {
    const saved = { _id: 'np1', name: '直建计划', isActive: true };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (MemberNutritionPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      memberId: new mongoose.Types.ObjectId().toString(),
      assignedById: new mongoose.Types.ObjectId().toString(),
      templateId: null,
      name: '直建计划',
      dayTypes: [],
      assignedAt: new Date(),
    });
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('updateSchedule sets schedule on active plan', async () => {
    const updated = { _id: 'np1', schedule: { weeklyPattern: [], calendarOverrides: [] } };
    mockModel.findOneAndUpdate.mockResolvedValue(updated as never);
    const schedule = { weeklyPattern: [{ dayOfWeek: 1 as const, dayTypeName: 'Training' }], calendarOverrides: [], iterate: true };
    const result = await repo.updateSchedule(new mongoose.Types.ObjectId().toString(), schedule);
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId), isActive: true },
      { $set: { schedule } },
      { new: true },
    );
    expect(result).toEqual(updated);
  });
});
