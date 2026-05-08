/** @jest-environment node */
jest.mock('@/lib/db/models/self-workout-log.model', () => ({
  SelfWorkoutLogModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
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
  findOneAndUpdate: jest.Mock;
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
          userId: new mongoose.Types.ObjectId(USER_A),
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
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_B),
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
        userId: new mongoose.Types.ObjectId(USER_A),
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
      expect(arg.userId).toEqual(new mongoose.Types.ObjectId(USER_A));
      expect(arg.completedAt.$gte).toEqual(new Date(2026, 4, 1));
      expect(arg.completedAt.$lt).toEqual(new Date(2026, 5, 1));
    });
  });

  describe('appendSet', () => {
    it('uses $push and scopes by userId', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.appendSet(LOG_ID, USER_A, sampleSet);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new mongoose.Types.ObjectId(LOG_ID),
          userId: new mongoose.Types.ObjectId(USER_A),
        },
        { $push: { sets: sampleSet } },
        { new: true },
      );
    });
  });

  describe('updateSet', () => {
    it('patches a specific set index, scopes by userId, stamps completedAt server-side', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.updateSet(LOG_ID, USER_A, 0, { actualWeight: 100, actualReps: 5 });
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new mongoose.Types.ObjectId(LOG_ID),
          userId: new mongoose.Types.ObjectId(USER_A),
        },
        { $set: {
          'sets.0.actualWeight': 100,
          'sets.0.actualReps': 5,
          'sets.0.completedAt': expect.any(Date),
        } },
        { new: true },
      );
    });
  });

  describe('complete', () => {
    it('sets completedAt + rpe + note and scopes by userId', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({ _id: LOG_ID } as never);
      await repo.complete(LOG_ID, USER_A, 8, 'felt strong');
      const call = mockModel.findOneAndUpdate.mock.calls[0];
      expect(call[0]).toMatchObject({
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
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
        _id: new mongoose.Types.ObjectId(LOG_ID),
        userId: new mongoose.Types.ObjectId(USER_A),
      });
    });
  });
});
