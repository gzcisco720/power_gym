// __tests__/lib/repositories/member-plan.repository.test.ts
import mongoose from 'mongoose';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberPlanModel } from '@/lib/db/models/member-plan.model';

jest.mock('@/lib/db/models/member-plan.model', () => ({
  MemberPlanModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    updateMany: jest.fn(),
  }),
}));

const mockModel = jest.mocked(MemberPlanModel);

describe('MongoMemberPlanRepository', () => {
  let repo: MongoMemberPlanRepository;

  beforeEach(() => {
    repo = new MongoMemberPlanRepository();
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('queries memberId + isActive: true', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findActive(id);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
        isActive: true,
      });
    });

    it('returns the active plan when found', async () => {
      const plan = { _id: 'p1', isActive: true };
      mockModel.findOne.mockResolvedValue(plan as never);
      const result = await repo.findActive(new mongoose.Types.ObjectId().toString());
      expect(result).toEqual(plan);
    });
  });

  describe('deactivateAll', () => {
    it('calls updateMany to set isActive false', async () => {
      mockModel.updateMany.mockResolvedValue({} as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.deactivateAll(id);
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        { $set: { isActive: false } },
      );
    });
  });

  describe('create', () => {
    it('saves and returns new member plan', async () => {
      const saved = { _id: 'mp1', name: 'PPL' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (MemberPlanModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        memberId: new mongoose.Types.ObjectId().toString(),
        trainerId: new mongoose.Types.ObjectId().toString(),
        templateId: new mongoose.Types.ObjectId().toString(),
        name: 'PPL',
        days: [],
        assignedAt: new Date(),
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
