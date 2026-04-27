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

const mockFind = mockModel.find as jest.Mock;
const mockFindOne = mockModel.findOne as jest.Mock;
const mockFindById = mockModel.findById as jest.Mock;
const mockFindByIdAndUpdate = mockModel.findByIdAndUpdate as jest.Mock;
const mockUpdateMany = mockModel.updateMany as jest.Mock;
const mockDistinct = mockModel.distinct as jest.Mock;

const TRAINER_ID = '507f1f77bcf86cd799439011';
const MEMBER_ID = '507f1f77bcf86cd799439012';
const SERIES_ID = '507f1f77bcf86cd799439013';

describe('MongoScheduledSessionRepository', () => {
  let repo: MongoScheduledSessionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    mockFindOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    mockFindById.mockResolvedValue(null);
    mockFindByIdAndUpdate.mockResolvedValue(null);
    mockUpdateMany.mockResolvedValue({});
    mockDistinct.mockResolvedValue([]);
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
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ date: { $gte: start, $lte: end } }));
  });

  it('findByDateRange passes trainerId filter when given', async () => {
    const start = new Date();
    const end = new Date();
    await repo.findByDateRange(start, end, { trainerId: TRAINER_ID });
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ trainerId: expect.anything() }));
  });

  it('cancelOne calls findByIdAndUpdate with cancelled status', async () => {
    await repo.cancelOne('abc123');
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('abc123', { $set: { status: 'cancelled' } });
  });

  it('cancelFuture calls updateMany with seriesId and date filter', async () => {
    const from = new Date('2026-05-05');
    await repo.cancelFuture(SERIES_ID, from);
    expect(mockUpdateMany).toHaveBeenCalledWith(
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
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('id1', { $set: { reminderSentAt: expect.any(Date) } });
  });

  it('findByMember calls find with memberIds filter', async () => {
    await repo.findByMember('507f1f77bcf86cd799439012');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ memberIds: expect.anything() }));
  });

  it('findById calls findById on model', async () => {
    await repo.findById('abc');
    expect(mockFindById).toHaveBeenCalledWith('abc');
  });

  it('updateOne calls findByIdAndUpdate', async () => {
    await repo.updateOne('id1', { startTime: '10:00' });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('id1', expect.objectContaining({ $set: expect.objectContaining({ startTime: '10:00' }) }));
  });

  it('updateFuture calls updateMany with status scheduled filter', async () => {
    const from = new Date('2026-05-05');
    await repo.updateFuture(SERIES_ID, from, { endTime: '11:00' });
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ date: { $gte: from }, status: 'scheduled' }),
      expect.objectContaining({ $set: expect.objectContaining({ endTime: '11:00' }) }),
    );
  });

  it('updateAll calls updateMany with status scheduled filter', async () => {
    await repo.updateAll(SERIES_ID, { startTime: '08:00' });
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'scheduled' }),
      expect.objectContaining({ $set: expect.objectContaining({ startTime: '08:00' }) }),
    );
  });

  it('cancelAll calls updateMany without date filter', async () => {
    await repo.cancelAll(SERIES_ID);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'scheduled' }),
      { $set: { status: 'cancelled' } },
    );
  });

  it('findUnreminded queries with date window and null reminderSentAt', async () => {
    const start = new Date('2026-05-05T09:00:00Z');
    const end = new Date('2026-05-05T10:00:00Z');
    await repo.findUnreminded(start, end);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      status: 'scheduled',
      reminderSentAt: null,
    }));
  });

  it('findActiveSeriesIds calls distinct with future date filter', async () => {
    await repo.findActiveSeriesIds();
    expect(mockDistinct).toHaveBeenCalledWith('seriesId', expect.objectContaining({
      status: 'scheduled',
      seriesId: { $ne: null },
    }));
  });

  it('findLatestInSeries calls findOne sorted by date desc', async () => {
    await repo.findLatestInSeries(SERIES_ID);
    expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({ seriesId: expect.anything() }));
  });

  it('removeMemberFromFutureSessions pulls member then cancels empty sessions', async () => {
    await repo.removeMemberFromFutureSessions('507f1f77bcf86cd799439012');
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
    // First call: pull member from memberIds
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ status: 'scheduled' }),
      { $pull: { memberIds: expect.anything() } },
    );
    // Second call: cancel sessions with empty memberIds
    expect(mockUpdateMany).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ memberIds: { $size: 0 }, status: 'scheduled' }),
      { $set: { status: 'cancelled' } },
    );
  });
});
