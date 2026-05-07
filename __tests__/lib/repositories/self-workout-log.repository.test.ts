jest.mock('@/lib/db/models/self-workout-log.model', () => ({
  SelfWorkoutLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }),
}));

import mongoose from 'mongoose';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { SelfWorkoutLogModel } from '@/lib/db/models/self-workout-log.model';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

const mockModel = jest.mocked(SelfWorkoutLogModel) as jest.MockedFunction<typeof SelfWorkoutLogModel> & {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findOneAndDelete: jest.Mock;
};

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439099';
const LOG_ID = '507f1f77bcf86cd799439020';
const EX_ID = '507f1f77bcf86cd799439030';

const sampleSet: ISelfWorkoutSet = {
  exerciseId: new mongoose.Types.ObjectId(EX_ID),
  exerciseName: 'Bench Press',
  groupId: 'g1',
  isSuperset: false,
  isBodyweight: false,
  setNumber: 1,
  prescribedRepsMin: 5,
  prescribedRepsMax: 8,
  actualWeight: null,
  actualReps: null,
  completedAt: null,
};

describe('MongoSelfWorkoutLogRepository', () => {
  let repo: MongoSelfWorkoutLogRepository;
  let saveSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoSelfWorkoutLogRepository();
    saveSpy = jest.fn().mockResolvedValue({ _id: LOG_ID });
    (mockModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveSpy }));
  });

  describe('create', () => {
    it('constructs a doc with userId converted to ObjectId', async () => {
      await repo.create({
        userId: USER_A,
        startedAt: new Date('2026-05-08'),
        sourceTemplateId: null,
        sourceTemplateDayNumber: null,
        dayName: 'Freestyle',
        sets: [sampleSet],
      });
      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          dayName: 'Freestyle',
        }),
      );
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('scopes by userId so user B cannot read user A logs', async () => {
      mockModel.findOne.mockResolvedValue({ _id: LOG_ID } as never);
      const result = await repo.findById(LOG_ID, USER_B);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findActive', () => {
    it('returns the latest open log scoped to userId', async () => {
      const sortFn = jest.fn().mockResolvedValue({ _id: LOG_ID });
      mockModel.findOne.mockReturnValue({ sort: sortFn } as never);
      const result = await repo.findActive(USER_A);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        userId: expect.any(mongoose.Types.ObjectId),
        completedAt: null,
      });
      expect(sortFn).toHaveBeenCalledWith({ startedAt: -1 });
      expect(result).toEqual({ _id: LOG_ID });
    });
  });

  describe('findByUserMonth', () => {
    it('queries with userId and a month range', async () => {
      const sortFn = jest.fn().mockResolvedValue([{ _id: LOG_ID }]);
      mockModel.find.mockReturnValue({ sort: sortFn } as never);
      await repo.findByUserMonth(USER_A, 2026, 5);
      const arg = mockModel.find.mock.calls[0][0] as { userId: unknown; completedAt: { $gte: Date; $lt: Date } };
      expect(arg.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(arg.completedAt.$gte).toEqual(new Date(2026, 4, 1));
      expect(arg.completedAt.$lt).toEqual(new Date(2026, 5, 1));
    });
  });

  describe('appendSet', () => {
    it('uses $push and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      await repo.appendSet(LOG_ID, USER_A, sampleSet);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { $push: { sets: sampleSet } },
        { new: true },
      );
    });
  });

  describe('updateSet', () => {
    it('patches a specific set index and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      const patch = { actualWeight: 100, actualReps: 5, completedAt: new Date('2026-05-08T10:00:00Z') };
      await repo.updateSet(LOG_ID, USER_A, 0, patch);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(mongoose.Types.ObjectId),
          userId: expect.any(mongoose.Types.ObjectId),
        },
        { $set: {
          'sets.0.actualWeight': 100,
          'sets.0.actualReps': 5,
          'sets.0.completedAt': patch.completedAt,
        } },
        { new: true },
      );
    });
  });

  describe('complete', () => {
    it('sets completedAt + rpe + note and scopes by userId', async () => {
      mockModel.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: LOG_ID }) as never;
      await repo.complete(LOG_ID, USER_A, 8, 'felt strong');
      const call = (mockModel.findOneAndUpdate as jest.Mock).mock.calls[0];
      expect(call[0]).toMatchObject({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
      expect(call[1].$set).toMatchObject({ rpe: 8, note: 'felt strong' });
      expect(call[1].$set.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('uses findOneAndDelete scoped by userId', async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.delete(LOG_ID, USER_A);
      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        userId: expect.any(mongoose.Types.ObjectId),
      });
    });
  });
});
