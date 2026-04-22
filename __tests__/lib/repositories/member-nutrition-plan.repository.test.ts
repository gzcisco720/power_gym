import mongoose from 'mongoose';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';

jest.mock('@/lib/db/models/member-nutrition-plan.model', () => ({
  MemberNutritionPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    updateMany: jest.fn(),
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

  it('findActive returns null when no active plan', async () => {
    mockModel.findOne.mockResolvedValue(null as never);
    const result = await repo.findActive(new mongoose.Types.ObjectId().toString());
    expect(result).toBeNull();
  });

  it('deactivateAll calls updateMany with isActive:false', async () => {
    mockModel.updateMany.mockResolvedValue({} as never);
    await repo.deactivateAll(new mongoose.Types.ObjectId().toString());
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      { memberId: expect.any(mongoose.Types.ObjectId) },
      { $set: { isActive: false } },
    );
  });

  it('create saves and returns new plan', async () => {
    const saved = { _id: 'np1', name: '增肌计划', isActive: true };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (MemberNutritionPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const result = await repo.create({
      memberId: new mongoose.Types.ObjectId().toString(),
      trainerId: new mongoose.Types.ObjectId().toString(),
      templateId: new mongoose.Types.ObjectId().toString(),
      name: '增肌计划',
      dayTypes: [],
      assignedAt: new Date(),
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });
});
