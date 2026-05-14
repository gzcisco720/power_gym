import mongoose from 'mongoose';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

jest.mock('@/lib/db/models/plan-template.model', () => ({
  PlanTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PlanTemplateModel);

describe('MongoPlanTemplateRepository — findByCreatorPaginated', () => {
  let repo: MongoPlanTemplateRepository;
  beforeEach(() => {
    repo = new MongoPlanTemplateRepository();
    jest.clearAllMocks();
  });

  it('returns templates and total', async () => {
    const chainMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ name: 'PPL' }]),
    };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(5 as never);
    const id = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByCreatorPaginated(id, 1, 15);
    expect(result.total).toBe(5);
    expect(result.templates).toEqual([{ name: 'PPL' }]);
  });

  it('sorts by createdAt desc and skips for page 2', async () => {
    const chainMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(20 as never);
    const id = new mongoose.Types.ObjectId().toString();
    await repo.findByCreatorPaginated(id, 2, 15);
    expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chainMock.skip).toHaveBeenCalledWith(15);
  });
});
