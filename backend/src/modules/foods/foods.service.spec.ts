import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { FoodsService } from './foods.service';
import { Food } from './food.model';

const USER_ID = new Types.ObjectId().toString();

const sampleMacros = {
  kcal: 380,
  protein: 13,
  carbs: 67,
  fat: 7,
};

describe('FoodsService', () => {
  let service: FoodsService;
  let foodModel: {
    find: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    foodModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodsService,
        {
          provide: getModelToken(Food.name),
          useValue: foodModel,
        },
      ],
    }).compile();

    service = module.get<FoodsService>(FoodsService);
  });

  describe('search', () => {
    it('matches name case-insensitively across own + global foods and caps results at the limit', async () => {
      const fakeResults = [
        { name: 'Chicken Breast', isGlobal: true },
        { name: 'Chicken Thigh', isGlobal: false, createdBy: USER_ID },
      ];
      const limitMock = jest.fn().mockResolvedValue(fakeResults);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      foodModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.search('chick', USER_ID, 5);

      const escaped = 'chick';
      expect(foodModel.find).toHaveBeenCalledWith({
        $or: [
          { isGlobal: true as const },
          { createdBy: new Types.ObjectId(USER_ID) },
        ],
        name: { $regex: escaped, $options: 'i' },
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(5);
      expect(result).toEqual(fakeResults);
    });

    it('returns newest-first when q is empty', async () => {
      const fakeResults = [{ name: 'Oats', isGlobal: true }];
      const limitMock = jest.fn().mockResolvedValue(fakeResults);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      foodModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.search('', USER_ID, 20);

      expect(foodModel.find).toHaveBeenCalledWith({
        $or: [
          { isGlobal: true as const },
          { createdBy: new Types.ObjectId(USER_ID) },
        ],
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(20);
      expect(result).toEqual(fakeResults);
    });
  });

  describe('create', () => {
    it('persists macrosPer100g and sets createdBy to userId', async () => {
      const dto = {
        name: 'Brown Rice',
        brand: null,
        macrosPer100g: sampleMacros,
        servings: [],
      };
      const saved = {
        _id: new Types.ObjectId(),
        ...dto,
        isGlobal: false,
        createdBy: USER_ID,
      };
      foodModel.create.mockResolvedValue(saved);

      const result = await service.create(dto, USER_ID);

      const createCall = foodModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(createCall[0].createdBy).toEqual(new Types.ObjectId(USER_ID));
      expect(createCall[0].macrosPer100g).toEqual(sampleMacros);
      expect(createCall[0].isGlobal).toBe(false);
      expect(result).toEqual(saved);
    });
  });
});
