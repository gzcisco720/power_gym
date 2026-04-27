/** @jest-environment node */

import mongoose from 'mongoose';

jest.mock('@/lib/db/models/scheduled-session.model', () => ({
  ScheduledSessionModel: Object.assign(jest.fn(), {
    insertMany: jest.fn(),
    find: jest.fn(() => ({ sort: jest.fn().mockResolvedValue([]) })),
    findOne: jest.fn(() => ({ sort: jest.fn().mockResolvedValue(null) })),
    findById: jest.fn().mockResolvedValue(null),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({}),
    distinct: jest.fn().mockResolvedValue([]),
  }),
}));

import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

const mockModel = jest.mocked(ScheduledSessionModel);

const TRAINER_ID = '507f1f77bcf86cd799439011';
const MEMBER_ID = '507f1f77bcf86cd799439012';
const SERIES_ID = '507f1f77bcf86cd799439013';

describe('MongoScheduledSessionRepository', () => {
  let repo: MongoScheduledSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockModel.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    repo = new MongoScheduledSessionRepository();
  });

  it('create calls save and returns doc', async () => {
    const fakeDoc = { _id: 'id1' };
    const saveMock = jest.fn().mockResolvedValue(fakeDoc);
    (ScheduledSessionModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));
    const result = await repo.create({
      seriesId: null,
      trainerId: TRAINER_ID,
      memberIds: [MEMBER_ID],
      date: new Date('2026-05-01'),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(saveMock).toHaveBeenCalled();
    expect(result).toBe(fakeDoc);
  });

  it('createMany calls insertMany', async () => {
    (mockModel.insertMany as jest.Mock).mockResolvedValue([]);
    await repo.createMany([
      { seriesId: SERIES_ID, trainerId: TRAINER_ID, memberIds: [], date: new Date(), startTime: '09:00', endTime: '10:00' },
    ]);
    expect(mockModel.insertMany).toHaveBeenCalled();
  });

  it('findByDateRange calls find with date range', async () => {
    const start = new Date('2026-05-01');
    const end = new Date('2026-05-07');
    await repo.findByDateRange(start, end);
    expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({ date: { $gte: start, $lte: end } }));
  });

  it('findByDateRange passes trainerId filter when given', async () => {
    const start = new Date();
    const end = new Date();
    await repo.findByDateRange(start, end, { trainerId: TRAINER_ID });
    expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({ trainerId: expect.anything() }));
  });

  it('cancelOne calls findByIdAndUpdate with cancelled status', async () => {
    await repo.cancelOne('abc123');
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('abc123', { $set: { status: 'cancelled' } });
  });

  it('cancelFuture calls updateMany with seriesId and date filter', async () => {
    const from = new Date('2026-05-05');
    await repo.cancelFuture(SERIES_ID, from);
    expect(mockModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        seriesId: expect.any(mongoose.Types.ObjectId),
        date: { $gte: from },
        status: 'scheduled',
      }),
      { $set: { status: 'cancelled' } },
    );
  });

  it('markReminderSent calls findByIdAndUpdate', async () => {
    await repo.markReminderSent('id1');
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('id1', { $set: { reminderSentAt: expect.any(Date) } });
  });
});
