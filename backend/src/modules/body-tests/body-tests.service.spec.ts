import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BodyTestsService } from './body-tests.service';
import { BodyTest } from '../../common/models/body-test.model';
import { User } from '../../common/models/user.model';
import { CreateBodyTestDto } from './dto/create-body-test.dto';

const OWNER_ID = new Types.ObjectId().toString();
const OTHER_OWNER_ID = new Types.ObjectId().toString();

const valid3SiteDto: CreateBodyTestDto = {
  date: '2026-06-03',
  age: 30,
  sex: 'male',
  weight: 80,
  protocol: '3site',
  chest: 10,
  abdominal: 20,
  thigh: 15,
};

const otherProtocolDto: CreateBodyTestDto = {
  date: '2026-06-03',
  age: 25,
  sex: 'female',
  weight: 60,
  protocol: 'other',
  bodyFatPct: 22,
};

describe('BodyTestsService', () => {
  let service: BodyTestsService;
  let bodyTestModel: {
    find: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    deleteOne: jest.Mock;
  };
  let userModel: { findById: jest.Mock };

  beforeEach(async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    bodyTestModel = {
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      findById: jest.fn(),
      create: jest.fn(),
      deleteOne: jest.fn(),
    };
    userModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BodyTestsService,
        { provide: getModelToken(BodyTest.name), useValue: bodyTestModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<BodyTestsService>(BodyTestsService);
  });

  describe('findByMember', () => {
    it('queries with memberId ObjectId and sorts by date desc', async () => {
      const fakeItems = [{ _id: 'a' }, { _id: 'b' }];
      const sortMock = jest.fn().mockResolvedValue(fakeItems);
      bodyTestModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findByMember(OWNER_ID);

      expect(bodyTestModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(OWNER_ID),
      });
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(fakeItems);
    });
  });

  describe('create', () => {
    it('stamps memberId from sub, sets trainerId null, persists calculated bodyFatPct/fatMassKg/leanMassKg for a 3site test', async () => {
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(OWNER_ID),
      });
      const saved = { _id: 'new-id', memberId: OWNER_ID };
      bodyTestModel.create.mockResolvedValue(saved);

      const result = await service.create(valid3SiteDto, OWNER_ID);

      const createCall = bodyTestModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      const createArg = createCall[0];
      expect(createArg.memberId).toEqual(new Types.ObjectId(OWNER_ID));
      expect(createArg.trainerId).toBeNull();
      expect(typeof createArg.bodyFatPct).toBe('number');
      expect(typeof createArg.fatMassKg).toBe('number');
      expect(typeof createArg.leanMassKg).toBe('number');

      // Verify client-sent bodyFatPct is ignored for calculated protocols
      // 3site formula result for chest=10, abdominal=20, thigh=15, age=30, weight=80
      const sum = 10 + 20 + 15;
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * 30;
      const expectedBodyFatPct = 495 / density - 450;
      expect(createArg.bodyFatPct as number).toBeCloseTo(expectedBodyFatPct, 4);

      expect(result).toEqual(saved);
    });

    it('for protocol "other" persists the client-supplied bodyFatPct', async () => {
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(OWNER_ID),
      });
      bodyTestModel.create.mockResolvedValue({ _id: 'other-id' });

      await service.create(otherProtocolDto, OWNER_ID);

      const otherCall = bodyTestModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(otherCall[0].bodyFatPct).toBe(22);
    });

    it('clamps an out-of-range computed value to the [1,60] range', async () => {
      const extremeDto: CreateBodyTestDto = {
        date: '2026-06-03',
        age: 80,
        sex: 'male',
        weight: 50,
        protocol: '3site',
        chest: 100,
        abdominal: 100,
        thigh: 100,
      };
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(OWNER_ID),
      });
      bodyTestModel.create.mockResolvedValue({ _id: 'clamped-id' });

      await service.create(extremeDto, OWNER_ID);

      const clampCall = bodyTestModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(clampCall[0].bodyFatPct as number).toBeLessThanOrEqual(60);
      expect(clampCall[0].bodyFatPct as number).toBeGreaterThanOrEqual(1);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.create(valid3SiteDto, OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the test does not exist', async () => {
      bodyTestModel.findById.mockResolvedValue(null);

      await expect(
        service.remove(new Types.ObjectId().toString(), OWNER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when memberId !== requesting sub', async () => {
      bodyTestModel.findById.mockResolvedValue({
        _id: 'some-id',
        memberId: new Types.ObjectId(OTHER_OWNER_ID),
      });

      await expect(
        service.remove(new Types.ObjectId().toString(), OWNER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes the document when memberId matches', async () => {
      const testId = new Types.ObjectId().toString();
      bodyTestModel.findById.mockResolvedValue({
        _id: testId,
        memberId: new Types.ObjectId(OWNER_ID),
      });
      bodyTestModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.remove(testId, OWNER_ID);

      expect(bodyTestModel.deleteOne).toHaveBeenCalledWith({ _id: testId });
    });
  });
});
