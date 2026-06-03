import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NutritionTemplatesService } from './nutrition-templates.service';
import { NutritionTemplate } from './nutrition-template.model';

const USER_ID = new Types.ObjectId().toString();
const OTHER_USER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();

const sampleDayType = {
  name: 'Training Day',
  meals: [
    {
      name: 'Breakfast',
      order: 1,
      items: [
        {
          foodName: 'Oats',
          quantityG: 100,
          kcal: 380,
          protein: 13,
          carbs: 67,
          fat: 7,
        },
      ],
    },
  ],
};

describe('NutritionTemplatesService', () => {
  let service: NutritionTemplatesService;
  let nutritionTemplateModel: {
    find: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
  };

  beforeEach(async () => {
    nutritionTemplateModel = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NutritionTemplatesService,
        {
          provide: getModelToken(NutritionTemplate.name),
          useValue: nutritionTemplateModel,
        },
      ],
    }).compile();

    service = module.get<NutritionTemplatesService>(NutritionTemplatesService);
  });

  describe('findOwn', () => {
    it('returns only templates where createdBy matches userId, sorted createdAt desc', async () => {
      const fakeTemplates = [
        { _id: TEMPLATE_ID, name: 'My Nutrition Plan', createdBy: USER_ID },
      ];
      nutritionTemplateModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeTemplates),
      });

      const result = await service.findOwn(USER_ID);

      expect(nutritionTemplateModel.find).toHaveBeenCalledWith({
        createdBy: new Types.ObjectId(USER_ID),
      });
      expect(result).toEqual(fakeTemplates);
    });
  });

  describe('create', () => {
    it('persists trimmed name and dayTypes with createdBy set to userId', async () => {
      const dto = { name: '  High Protein  ', dayTypes: [sampleDayType] };
      const saved = {
        _id: TEMPLATE_ID,
        name: 'High Protein',
        dayTypes: [sampleDayType],
        createdBy: USER_ID,
      };
      nutritionTemplateModel.create.mockResolvedValue(saved);

      const result = await service.create(dto, USER_ID);

      const createCall = nutritionTemplateModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(createCall[0].name).toBe('High Protein');
      expect(createCall[0].createdBy).toEqual(new Types.ObjectId(USER_ID));
      expect(createCall[0].dayTypes).toEqual([sampleDayType]);
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('replaces name and dayTypes and returns the updated doc when owned', async () => {
      const newDayTypes = [{ name: 'Rest Day', meals: [] }];
      const dto = { name: 'Updated Plan', dayTypes: newDayTypes };
      const updated = { _id: TEMPLATE_ID, ...dto, createdBy: USER_ID };
      nutritionTemplateModel.findOneAndUpdate.mockResolvedValue(updated);

      const result = await service.update(TEMPLATE_ID, dto, USER_ID);

      expect(nutritionTemplateModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(TEMPLATE_ID),
          createdBy: new Types.ObjectId(USER_ID),
        },
        { $set: { name: 'Updated Plan', dayTypes: newDayTypes } },
        { returnDocument: 'after' },
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when id does not exist or is not owned by userId', async () => {
      nutritionTemplateModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.update(TEMPLATE_ID, { name: 'X', dayTypes: [] }, OTHER_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when template is not owned by userId', async () => {
      nutritionTemplateModel.findOne.mockResolvedValue(null);

      await expect(service.remove(TEMPLATE_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the template when it exists and is owned by the caller', async () => {
      nutritionTemplateModel.findOne.mockResolvedValue({
        _id: TEMPLATE_ID,
        createdBy: new Types.ObjectId(USER_ID),
      });
      nutritionTemplateModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.remove(TEMPLATE_ID, USER_ID);

      expect(nutritionTemplateModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(TEMPLATE_ID),
      });
    });
  });
});
