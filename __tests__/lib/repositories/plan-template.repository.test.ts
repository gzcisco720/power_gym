// __tests__/lib/repositories/plan-template.repository.test.ts
import mongoose from 'mongoose';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

jest.mock('@/lib/db/models/plan-template.model', () => ({
  PlanTemplateModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

const mockModel = jest.mocked(PlanTemplateModel);

describe('MongoPlanTemplateRepository', () => {
  let repo: MongoPlanTemplateRepository;

  beforeEach(() => {
    repo = new MongoPlanTemplateRepository();
    jest.clearAllMocks();
  });

  describe('findByCreator', () => {
    it('queries by createdBy ObjectId', async () => {
      mockModel.find.mockResolvedValue([] as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findByCreator(id);
      expect(mockModel.find).toHaveBeenCalledWith({
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });
  });

  describe('findById', () => {
    it('calls findById with id', async () => {
      mockModel.findById.mockResolvedValue(null as never);
      await repo.findById('abc');
      expect(mockModel.findById).toHaveBeenCalledWith('abc');
    });
  });

  describe('create', () => {
    it('saves and returns new template', async () => {
      const saved = { _id: 't1', name: 'Push Pull Legs' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (PlanTemplateModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create({
        name: 'Push Pull Legs',
        description: null,
        createdBy: new mongoose.Types.ObjectId().toString(),
        days: [],
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('calls findByIdAndUpdate with id and data', async () => {
      const updated = { _id: 't1', name: 'New Name' };
      mockModel.findByIdAndUpdate.mockResolvedValue(updated as never);

      const result = await repo.update('t1', { name: 'New Name' });

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        't1',
        { $set: { name: 'New Name' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteById', () => {
    it('returns true when document deleted', async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: 't1' } as never);
      const createdBy = new mongoose.Types.ObjectId().toString();
      const result = await repo.deleteById('t1', createdBy);
      expect(result).toBe(true);
    });

    it('returns false when document not found', async () => {
      mockModel.findOneAndDelete.mockResolvedValue(null as never);
      const createdBy = new mongoose.Types.ObjectId().toString();
      const result = await repo.deleteById('t1', createdBy);
      expect(result).toBe(false);
    });

    it('queries createdBy as ObjectId', async () => {
      mockModel.findOneAndDelete.mockResolvedValue(null as never);
      const createdBy = new mongoose.Types.ObjectId().toString();
      await repo.deleteById('t1', createdBy);
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 't1',
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });
  });
});
