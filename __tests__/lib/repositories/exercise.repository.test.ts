import mongoose from 'mongoose';
import { MongoExerciseRepository } from '@/lib/repositories/exercise.repository';
import { ExerciseModel } from '@/lib/db/models/exercise.model';

jest.mock('@/lib/db/models/exercise.model', () => ({
  ExerciseModel: Object.assign(jest.fn(), {
    find: jest.fn(),
  }),
}));

const mockModel = jest.mocked(ExerciseModel);

describe('MongoExerciseRepository', () => {
  let repo: MongoExerciseRepository;

  beforeEach(() => {
    repo = new MongoExerciseRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('queries only isGlobal when no creatorId provided', async () => {
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

    it('returns exercises from model', async () => {
      const exercises = [{ _id: 'e1', name: 'Bench Press' }];
      mockModel.find.mockResolvedValue(exercises as never);
      const result = await repo.findAll({});
      expect(result).toEqual(exercises);
    });
  });

  describe('create', () => {
    it('saves and returns new exercise', async () => {
      const saved = { _id: 'e1', name: 'Squat' };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (ExerciseModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const trainerId = new mongoose.Types.ObjectId().toString();
      const result = await repo.create({
        name: 'Squat',
        muscleGroup: 'Quads',
        isGlobal: false,
        createdBy: trainerId,
        imageUrl: null,
        isBodyweight: false,
      });

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });
});
