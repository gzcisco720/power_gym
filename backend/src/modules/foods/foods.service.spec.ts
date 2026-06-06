import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FoodsService } from './foods.service';
import { Food } from './food.model';

const USER_ID = new Types.ObjectId().toString();
const OTHER_USER_ID = new Types.ObjectId().toString();
const FOOD_ID = new Types.ObjectId().toString();

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
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    foodModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
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

  describe('update', () => {
    const dto = { name: 'Updated Name' };
    const ownerFood = {
      _id: new Types.ObjectId(FOOD_ID),
      name: 'Original Name',
      isGlobal: false,
      createdBy: new Types.ObjectId(USER_ID),
    };

    it('applies $set of provided fields and returns updated document with { new: true } when caller is the creator', async () => {
      const updatedFood = { ...ownerFood, name: 'Updated Name' };
      foodModel.findById.mockResolvedValue(ownerFood);
      foodModel.findByIdAndUpdate.mockResolvedValue(updatedFood);

      const result = await service.update(FOOD_ID, dto, USER_ID);

      expect(foodModel.findById).toHaveBeenCalledWith(FOOD_ID);
      expect(foodModel.findByIdAndUpdate).toHaveBeenCalledWith(
        FOOD_ID,
        { $set: dto },
        { returnDocument: 'after' },
      );
      expect(result).toEqual(updatedFood);
    });

    it('throws NotFoundException when the food id does not exist', async () => {
      foodModel.findById.mockResolvedValue(null);

      await expect(service.update(FOOD_ID, dto, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the food is global (isGlobal true)', async () => {
      const globalFood = { ...ownerFood, isGlobal: true };
      foodModel.findById.mockResolvedValue(globalFood);

      await expect(service.update(FOOD_ID, dto, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when createdBy does not match userId', async () => {
      const otherFood = {
        ...ownerFood,
        createdBy: new Types.ObjectId(OTHER_USER_ID),
      };
      foodModel.findById.mockResolvedValue(otherFood);

      await expect(service.update(FOOD_ID, dto, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    const ownerFood = {
      _id: new Types.ObjectId(FOOD_ID),
      name: 'To Delete',
      isGlobal: false,
      createdBy: new Types.ObjectId(USER_ID),
    };

    it('calls findByIdAndDelete when caller is the creator', async () => {
      foodModel.findById.mockResolvedValue(ownerFood);
      foodModel.findByIdAndDelete.mockResolvedValue(ownerFood);

      await service.remove(FOOD_ID, USER_ID);

      expect(foodModel.findByIdAndDelete).toHaveBeenCalledWith(FOOD_ID);
    });

    it('throws ForbiddenException when createdBy does not match userId', async () => {
      const otherFood = {
        ...ownerFood,
        createdBy: new Types.ObjectId(OTHER_USER_ID),
      };
      foodModel.findById.mockResolvedValue(otherFood);

      await expect(service.remove(FOOD_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
