import mongoose from 'mongoose';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { CheckInModel } from '@/lib/db/models/check-in.model';

jest.mock('@/lib/db/models/check-in.model', () => ({
  CheckInModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  }),
}));

const mockModel = jest.mocked(CheckInModel);
const memberId = new mongoose.Types.ObjectId().toString();
const trainerId = new mongoose.Types.ObjectId().toString();

function makeCheckInData() {
  return {
    memberId, trainerId,
    submittedAt: new Date(),
    sleepQuality: 7, stress: 3, fatigue: 4,
    hunger: 5, recovery: 6, energy: 8, digestion: 7,
    weight: 75, waist: null, steps: null, exerciseMinutes: null,
    walkRunDistance: null, sleepHours: null,
    dietDetails: 'good', stuckToDiet: 'yes' as const,
    wellbeing: 'great', notes: '',
    photos: [],
  };
}

describe('MongoCheckInRepository', () => {
  let repo: MongoCheckInRepository;

  beforeEach(() => {
    repo = new MongoCheckInRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('saves and returns the check-in', async () => {
      const data = makeCheckInData();
      const saved = { _id: 'ci1', ...data };
      const saveMock = jest.fn().mockResolvedValue(saved);
      (CheckInModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const result = await repo.create(data);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });
  });

  describe('findByMember', () => {
    it('returns check-ins sorted by submittedAt descending', async () => {
      const items = [{ _id: 'ci2' }, { _id: 'ci1' }];
      const sortMock = jest.fn().mockResolvedValue(items);
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findByMember(memberId);

      expect(mockModel.find).toHaveBeenCalledWith({
        memberId: expect.any(mongoose.Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(result).toEqual(items);
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findById('000000000000000000000099', memberId);
      expect(result).toBeNull();
    });
  });

  describe('hasCheckInThisWeek', () => {
    it('returns true when countDocuments is 1', async () => {
      mockModel.countDocuments.mockResolvedValue(1 as never);
      const weekStart = new Date('2026-04-27T00:00:00Z');
      const result = await repo.hasCheckInThisWeek(memberId, weekStart);
      expect(result).toBe(true);
    });
  });
});
