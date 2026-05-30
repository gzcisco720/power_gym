import 'reflect-metadata';
import { ScheduleService } from './schedule.service';
import type { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import type { IScheduledSession } from '../database/models/scheduled-session.model';
import { Types } from 'mongoose';

function makeSession(
  overrides: Partial<IScheduledSession> = {},
): IScheduledSession {
  return {
    _id: new Types.ObjectId(),
    seriesId: null,
    trainerId: new Types.ObjectId(),
    memberIds: [new Types.ObjectId()],
    date: new Date('2024-03-15'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    serviceTypeId: null,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IScheduledSession;
}

function makeRepo(
  overrides: Record<string, jest.Mock> = {},
): ScheduledSessionRepository {
  return {
    create: jest.fn(),
    createMany: jest.fn(),
    findByMember: jest.fn(),
    findByIdAndTrainer: jest.fn(),
    cancelById: jest.fn(),
    findUnreminded: jest.fn(),
    markReminderSent: jest.fn(),
    findActiveSeriesIds: jest.fn(),
    findLatestInSeries: jest.fn(),
    findForBilling: jest.fn(),
    findSessionsForBillingRange: jest.fn(),
    findByDateRange: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
    updateFuture: jest.fn(),
    updateAll: jest.fn(),
    cancelOne: jest.fn(),
    cancelFuture: jest.fn(),
    cancelAll: jest.fn(),
    ...overrides,
  } as unknown as ScheduledSessionRepository;
}

describe('ScheduleService', () => {
  describe('create', () => {
    it('persists a scheduled session', async () => {
      const created = makeSession();
      const create = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create });
      const svc = new ScheduleService(repo);

      const result = await svc.create({
        trainerId: 'trainer1',
        memberIds: ['member1'],
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '10:00',
        isRecurring: false,
        serviceTypeId: null,
        customServiceName: 'Session',
        customFee: 80,
      });

      expect(result).toEqual({ sessions: [created] });
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('creates a recurring series of 12 weekly sessions', async () => {
      const sessions = Array.from({ length: 12 }, () => makeSession());
      const createMany = jest.fn().mockResolvedValue(sessions);
      const repo = makeRepo({ createMany });
      const svc = new ScheduleService(repo);

      const result = await svc.create({
        trainerId: 'trainer1',
        memberIds: ['member1'],
        date: new Date('2024-03-15'),
        startTime: '09:00',
        endTime: '10:00',
        isRecurring: true,
        serviceTypeId: 'st1',
        customServiceName: null,
        customFee: null,
      });

      expect(result.sessions).toHaveLength(12);
      expect(createMany).toHaveBeenCalled();
      const calls = createMany.mock.calls as [{ date: Date }[]][];
      const arg = calls[0][0];
      expect(arg).toHaveLength(12);
      // Each session 7 days apart
      const dates = arg.map((s) => s.date.getTime());
      expect(dates[1] - dates[0]).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('getRange', () => {
    it('returns sessions in date range', async () => {
      const sessions = [makeSession(), makeSession()];
      const findByDateRange = jest.fn().mockResolvedValue(sessions);
      const repo = makeRepo({ findByDateRange });
      const svc = new ScheduleService(repo);

      const result = await svc.getRange(
        new Date('2024-03-01'),
        new Date('2024-03-31'),
        { role: 'owner', userId: 'owner1' },
      );

      expect(result).toEqual({ sessions });
    });
  });

  describe('deleteSession', () => {
    it('cancels one session by scope "one"', async () => {
      const session = makeSession({ seriesId: null });
      const findById = jest.fn().mockResolvedValue(session);
      const cancelOne = jest.fn().mockResolvedValue(undefined);
      const repo = makeRepo({ findById, cancelOne });
      const svc = new ScheduleService(repo);

      await svc.deleteSession(session._id.toString(), 'one');

      expect(cancelOne).toHaveBeenCalled();
    });
  });
});
