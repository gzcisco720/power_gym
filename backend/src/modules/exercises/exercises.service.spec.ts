import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ExercisesService } from './exercises.service';
import { Exercise } from '../../common/models/exercise.model';

const USER_ID = new Types.ObjectId().toString();

describe('ExercisesService', () => {
  let service: ExercisesService;
  let exerciseModel: {
    find: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(async () => {
    exerciseModel = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: getModelToken(Exercise.name),
          useValue: exerciseModel,
        },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
  });

  describe('search', () => {
    it("returns global exercises plus the caller's own, filtered case-insensitively by q", async () => {
      const fakeResults = [
        { name: 'Bench Press', isGlobal: true },
        { name: 'Bench Fly', isGlobal: false, createdBy: USER_ID },
      ];
      exerciseModel.find.mockResolvedValue(fakeResults);

      const result = await service.search('bench', USER_ID);

      expect(exerciseModel.find).toHaveBeenCalledWith({
        $or: [{ isGlobal: true }, { createdBy: new Types.ObjectId(USER_ID) }],
        name: { $regex: 'bench', $options: 'i' },
      });
      expect(result).toEqual(fakeResults);
    });

    it('returns all visible exercises when q is empty', async () => {
      const fakeResults = [{ name: 'Squat', isGlobal: true }];
      exerciseModel.find.mockResolvedValue(fakeResults);

      const result = await service.search('', USER_ID);

      expect(exerciseModel.find).toHaveBeenCalledWith({
        $or: [{ isGlobal: true }, { createdBy: new Types.ObjectId(USER_ID) }],
      });
      expect(result).toEqual(fakeResults);
    });
  });

  describe('create', () => {
    it('sets isGlobal false and createdBy to the caller and returns the created exercise', async () => {
      const dto = {
        name: 'My Exercise',
        muscleGroup: 'chest',
        isBodyweight: false,
      };
      const saved = {
        _id: new Types.ObjectId(),
        ...dto,
        isGlobal: false,
        createdBy: USER_ID,
      };
      exerciseModel.create.mockResolvedValue(saved);

      const result = await service.create(dto, USER_ID);

      const createCall = exerciseModel.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(createCall[0].isGlobal).toBe(false);
      expect(createCall[0].createdBy).toEqual(new Types.ObjectId(USER_ID));
      expect(createCall[0].name).toBe('My Exercise');
      expect(result).toEqual(saved);
    });
  });
});
