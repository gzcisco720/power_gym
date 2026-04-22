// __tests__/lib/repositories/food.repository.test.ts
import mongoose from 'mongoose';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import { FoodModel } from '@/lib/db/models/food.model';

jest.mock('@/lib/db/models/food.model', () => ({
  FoodModel: Object.assign(jest.fn(), {
    find: jest.fn(),
  }),
}));

const mockModel = jest.mocked(FoodModel);

describe('MongoFoodRepository', () => {
  let repo: MongoFoodRepository;

  beforeEach(() => {
    repo = new MongoFoodRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('queries only isGlobal when no creatorId', async () => {
      mockModel.find.mockResolvedValue([] as never);
      await repo.findAll({});
      expect(mockModel.find).toHaveBeenCalledWith({ isGlobal: true });
    });

    it('queries isGlobal OR createdBy when creatorId provided', async () => {
      mockModel.find.mockResolvedValue([] as never);
      const id = new mongoose.Types.ObjectId().toString();
      await repo.findAll({ creatorId: id });
      expect(mockModel.find).toHaveBeenCalledWith({
        $or: [{ isGlobal: true }, { createdBy: expect.any(mongoose.Types.ObjectId) }],
      });
    });

    it('returns foods from model', async () => {
      const foods = [{ _id: 'f1', name: '鸡胸肉' }];
      mockModel.find.mockResolvedValue(foods as never);
      const result = await repo.findAll({});
      expect(result).toEqual(foods);
    });
  });

  describe('create', () => {
    it('saves and returns new food', async () => {
      const saved = { _id: 'f1', name: '白米饭' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (FoodModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const trainerId = new mongoose.Types.ObjectId().toString();
      const result = await repo.create({
        name: '白米饭',
        brand: null,
        createdBy: trainerId,
        isGlobal: false,
        per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
        perServing: null,
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
