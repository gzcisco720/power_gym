import mongoose from 'mongoose';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

jest.mock('@/lib/db/models/nutrition-template.model', () => ({
  NutritionTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

const mockModel = jest.mocked(NutritionTemplateModel);

describe('MongoNutritionTemplateRepository', () => {
  let repo: MongoNutritionTemplateRepository;

  beforeEach(() => {
    repo = new MongoNutritionTemplateRepository();
    jest.clearAllMocks();
  });

  it('findByCreator queries by createdBy ObjectId', async () => {
    mockModel.find.mockResolvedValue([] as never);
    const id = new mongoose.Types.ObjectId().toString();
    await repo.findByCreator(id);
    expect(mockModel.find).toHaveBeenCalledWith({
      createdBy: expect.any(mongoose.Types.ObjectId),
    });
  });

  it('findById delegates to model', async () => {
    const template = { _id: 't1', name: '减脂计划' };
    mockModel.findById.mockResolvedValue(template as never);
    const result = await repo.findById('t1');
    expect(result).toEqual(template);
  });

  it('create saves and returns template', async () => {
    const saved = { _id: 't1', name: '增肌计划' };
    const saveMock = jest.fn().mockResolvedValue(saved);
    (NutritionTemplateModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

    const trainerId = new mongoose.Types.ObjectId().toString();
    const result = await repo.create({
      name: '增肌计划',
      description: null,
      createdBy: trainerId,
      dayTypes: [],
    });

    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(saved);
  });

  it('update calls findByIdAndUpdate with $set', async () => {
    const updated = { _id: 't1', name: 'Updated' };
    mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);
    const result = await repo.update('t1', { name: 'Updated' });
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('t1', { $set: { name: 'Updated' } }, { new: true });
    expect(result).toEqual(updated);
  });

  it('deleteById calls findOneAndDelete with createdBy check', async () => {
    mockModel.findOneAndDelete.mockResolvedValue({ _id: 't1' } as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    const result = await repo.deleteById('t1', trainerId);
    expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: 't1',
      createdBy: expect.any(mongoose.Types.ObjectId),
    });
    expect(result).toBe(true);
  });

  it('deleteById returns false when not found', async () => {
    mockModel.findOneAndDelete.mockResolvedValue(null as never);
    const trainerId = new mongoose.Types.ObjectId().toString();
    const result = await repo.deleteById('t1', trainerId);
    expect(result).toBe(false);
  });
});
