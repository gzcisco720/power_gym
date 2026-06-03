import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PlanTemplatesService } from './plan-templates.service';
import { PlanTemplate } from '../../common/models/plan-template.model';

const USER_ID = new Types.ObjectId().toString();
const OTHER_USER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();

const exerciseObjectId = new Types.ObjectId();

const sampleDay = {
  dayNumber: 1,
  name: 'Day 1',
  exercises: [
    {
      groupId: 'g1',
      isSuperset: false,
      exerciseId: exerciseObjectId.toString(),
      exerciseName: 'Bench Press',
      imageUrl: null,
      isBodyweight: false,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 60,
    },
  ],
};

const sampleDayMapped = {
  dayNumber: 1,
  name: 'Day 1',
  exercises: [
    {
      groupId: 'g1',
      isSuperset: false,
      exerciseId: exerciseObjectId,
      exerciseName: 'Bench Press',
      imageUrl: null,
      isBodyweight: false,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 60,
    },
  ],
};

describe('PlanTemplatesService', () => {
  let service: PlanTemplatesService;
  let planTemplateModel: {
    find: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
  };

  beforeEach(async () => {
    planTemplateModel = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanTemplatesService,
        {
          provide: getModelToken(PlanTemplate.name),
          useValue: planTemplateModel,
        },
      ],
    }).compile();

    service = module.get<PlanTemplatesService>(PlanTemplatesService);
  });

  describe('findOwn', () => {
    it('returns only templates where createdBy equals the requesting user id', async () => {
      const fakeTemplates = [
        { _id: TEMPLATE_ID, name: 'My Plan', createdBy: USER_ID },
      ];
      planTemplateModel.find.mockResolvedValue(fakeTemplates);

      const result = await service.findOwn(USER_ID);

      expect(planTemplateModel.find).toHaveBeenCalledWith({
        createdBy: new Types.ObjectId(USER_ID),
      });
      expect(result).toEqual(fakeTemplates);
    });
  });

  describe('create', () => {
    it('persists template with createdBy set to the requesting user and returns it with days intact', async () => {
      const dto = { name: 'Push Day', description: null, days: [sampleDay] };
      const saved = { _id: TEMPLATE_ID, ...dto, createdBy: USER_ID };
      planTemplateModel.create.mockResolvedValue(saved);

      const result = await service.create(dto, USER_ID);

      const createCall = planTemplateModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(createCall[0].createdBy).toEqual(new Types.ObjectId(USER_ID));
      expect(createCall[0].name).toBe('Push Day');
      expect(createCall[0].days).toEqual([sampleDayMapped]);
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('full-replaces the days array and updates name/description', async () => {
      const newDays = [{ dayNumber: 1, name: 'Updated Day', exercises: [] }];
      const dto = { name: 'Updated Plan', description: 'desc', days: newDays };
      const updated = { _id: TEMPLATE_ID, ...dto, createdBy: USER_ID };
      planTemplateModel.findOneAndUpdate.mockResolvedValue(updated);

      const result = await service.update(TEMPLATE_ID, dto, USER_ID);

      expect(planTemplateModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(TEMPLATE_ID),
          createdBy: new Types.ObjectId(USER_ID),
        },
        { $set: { name: 'Updated Plan', description: 'desc', days: newDays } },
        { returnDocument: 'after' },
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when the template is not owned by the caller', async () => {
      planTemplateModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.update(TEMPLATE_ID, { name: 'X', days: [] }, OTHER_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the template does not exist or is not owned by the caller', async () => {
      planTemplateModel.findOne.mockResolvedValue(null);

      await expect(service.remove(TEMPLATE_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the template when it exists and is owned by the caller', async () => {
      planTemplateModel.findOne.mockResolvedValue({
        _id: TEMPLATE_ID,
        createdBy: new Types.ObjectId(USER_ID),
      });
      planTemplateModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.remove(TEMPLATE_ID, USER_ID);

      expect(planTemplateModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(TEMPLATE_ID),
      });
    });
  });
});
