import mongoose from 'mongoose';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { CheckInConfigModel } from '@/lib/db/models/check-in-config.model';

jest.mock('@/lib/db/models/check-in-config.model', () => ({
  CheckInConfigModel: Object.assign(jest.fn(), {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  }),
}));

const mockModel = jest.mocked(CheckInConfigModel);
const memberId = new mongoose.Types.ObjectId().toString();
const trainerId = new mongoose.Types.ObjectId().toString();

describe('MongoCheckInConfigRepository', () => {
  let repo: MongoCheckInConfigRepository;

  beforeEach(() => {
    repo = new MongoCheckInConfigRepository();
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('calls findOneAndUpdate with upsert and returns the document', async () => {
      const config = { memberId, trainerId, dayOfWeek: 4, hour: 7, minute: 0, active: true, reminderSentAt: null };
      mockModel.findOneAndUpdate.mockResolvedValue(config as never);

      const result = await repo.upsert(memberId, trainerId, { dayOfWeek: 4, hour: 7, minute: 0, active: true });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        expect.objectContaining({ $set: expect.objectContaining({ dayOfWeek: 4, hour: 7 }) }),
        { upsert: true, new: true },
      );
      expect(result).toEqual(config);
    });
  });

  describe('findByMember', () => {
    it('returns null when no config exists', async () => {
      mockModel.findOne.mockResolvedValue(null as never);
      const result = await repo.findByMember(memberId);
      expect(result).toBeNull();
    });
  });

  describe('findDueForReminder', () => {
    it('queries by dayOfWeek, hour, active=true, and reminderSentAt before week start', async () => {
      const weekStart = new Date('2026-04-27T00:00:00Z');
      mockModel.find.mockResolvedValue([]);

      await repo.findDueForReminder(4, 7, weekStart);

      expect(mockModel.find).toHaveBeenCalledWith({
        dayOfWeek: 4,
        hour: 7,
        active: true,
        $or: [{ reminderSentAt: null }, { reminderSentAt: { $lt: weekStart } }],
      });
    });
  });

  describe('markReminderSent', () => {
    it('calls findOneAndUpdate with memberId and sets reminderSentAt', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);
      const now = new Date();

      await repo.markReminderSent(memberId, now);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { memberId: expect.any(mongoose.Types.ObjectId) },
        { $set: { reminderSentAt: now } },
      );
    });
  });
});
