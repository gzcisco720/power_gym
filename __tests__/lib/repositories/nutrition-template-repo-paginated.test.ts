import mongoose from 'mongoose';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

jest.mock('@/lib/db/models/nutrition-template.model', () => ({
  NutritionTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionTemplateModel);

describe('MongoNutritionTemplateRepository — findByCreatorPaginated', () => {
  let repo: MongoNutritionTemplateRepository;
  beforeEach(() => {
    repo = new MongoNutritionTemplateRepository();
    jest.clearAllMocks();
  });

  it('returns templates and total', async () => {
    const chainMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ name: 'Lean Bulk' }]),
    };
    mockModel.find.mockReturnValue(chainMock as never);
    mockModel.countDocuments.mockResolvedValue(3 as never);
    const id = new mongoose.Types.ObjectId().toString();
    const result = await repo.findByCreatorPaginated(id, 1, 15);
    expect(result.total).toBe(3);
  });
});
