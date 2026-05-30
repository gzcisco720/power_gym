import mongoose from 'mongoose';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { CheckInModel } from '@/lib/db/models/check-in.model';

jest.mock('@/lib/db/models/check-in.model', () => ({
  CheckInModel: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
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
    it('returns true when a check-in exists this week', async () => {
      mockModel.exists.mockResolvedValue({ _id: 'ci1' } as never);
      const weekStart = new Date('2026-04-27T00:00:00Z');
      const result = await repo.hasCheckInThisWeek(memberId, weekStart);
      expect(result).toBe(true);
    });

    it('returns false when no check-in exists this week', async () => {
      mockModel.exists.mockResolvedValue(null as never);
      const weekStart = new Date('2026-04-27T00:00:00Z');
      const result = await repo.hasCheckInThisWeek(memberId, weekStart);
      expect(result).toBe(false);
    });
  });

  describe('findRecentByTrainer', () => {
    it('returns check-ins for trainer since given date sorted newest first', async () => {
      const since = new Date('2026-05-15T00:00:00Z');
      const docs = [
        { memberId: new mongoose.Types.ObjectId(memberId), submittedAt: new Date('2026-05-20') },
        { memberId: new mongoose.Types.ObjectId(memberId), submittedAt: new Date('2026-05-16') },
      ];
      const leanMock = jest.fn().mockResolvedValue(docs);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findRecentByTrainer(trainerId, since);

      expect(mockModel.find).toHaveBeenCalledWith({
        trainerId: expect.any(mongoose.Types.ObjectId),
        submittedAt: { $gte: since },
      });
      expect(sortMock).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(leanMock).toHaveBeenCalled();
      expect(result).toEqual(docs);
    });

    it('returns empty array when no recent check-ins', async () => {
      const leanMock = jest.fn().mockResolvedValue([]);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findRecentByTrainer(trainerId, new Date());

      expect(result).toEqual([]);
    });
  });

  describe('findPhotosForMember', () => {
    it('returns only check-ins that have photos, with _id, submittedAt, photos, weight', async () => {
      const submittedAt = new Date('2026-05-01');
      const mockDocs = [
        { _id: { toString: () => 'ci1' }, submittedAt, photos: ['url1', 'url2'], weight: 78 },
      ];
      const leanMock = jest.fn().mockResolvedValue(mockDocs);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findPhotosForMember(memberId);

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ 'photos.0': { $exists: true } }),
        expect.objectContaining({ photos: 1, weight: 1 }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        _id: 'ci1',
        submittedAt,
        photos: ['url1', 'url2'],
        weight: 78,
      });
    });

    it('maps weight to null when undefined', async () => {
      const mockDocs = [
        { _id: { toString: () => 'ci2' }, submittedAt: new Date(), photos: ['url1'], weight: undefined },
      ];
      const leanMock = jest.fn().mockResolvedValue(mockDocs);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      mockModel.find.mockReturnValue({ sort: sortMock } as never);

      const result = await repo.findPhotosForMember(memberId);

      expect(result[0].weight).toBeNull();
    });
  });
});
