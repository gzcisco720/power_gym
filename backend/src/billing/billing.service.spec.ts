import 'reflect-metadata';
import { BillingService } from './billing.service';
import type { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import type { ServiceTypeRepository } from '../repositories/service-type.repository';
import type { IScheduledSession } from '../database/models/scheduled-session.model';
import type { IServiceType } from '../database/models/service-type.model';
import { Types } from 'mongoose';

function makeSession(
  overrides: Partial<IScheduledSession> = {},
): IScheduledSession {
  const serviceTypeId = new Types.ObjectId();
  return {
    _id: new Types.ObjectId(),
    seriesId: null,
    trainerId: new Types.ObjectId(),
    memberIds: [new Types.ObjectId()],
    date: new Date('2024-01-10'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    serviceTypeId,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IScheduledSession;
}

function makeServiceType(overrides: Partial<IServiceType> = {}): IServiceType {
  return {
    _id: new Types.ObjectId(),
    name: 'Personal Training',
    durationMin: 60,
    pricePerSession: 80,
    currency: 'AUD',
    note: null,
    isActive: true,
    createdBy: new Types.ObjectId(),
    createdAt: new Date(),
    ...overrides,
  } as unknown as IServiceType;
}

function makeSessionRepo(
  overrides: Record<string, jest.Mock> = {},
): ScheduledSessionRepository {
  return {
    findForBilling: jest.fn(),
    findSessionsForBillingRange: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    findByMember: jest.fn(),
    findByIdAndTrainer: jest.fn(),
    cancelById: jest.fn(),
    findUnreminded: jest.fn(),
    markReminderSent: jest.fn(),
    findActiveSeriesIds: jest.fn(),
    findLatestInSeries: jest.fn(),
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

function makeServiceTypeRepo(
  overrides: Record<string, jest.Mock> = {},
): ServiceTypeRepository {
  return {
    findAll: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIds: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as ServiceTypeRepository;
}

describe('BillingService', () => {
  describe('getBilling', () => {
    it('computes totals for each member with past sessions linked to service types', async () => {
      const memberId = new Types.ObjectId();
      const serviceTypeId = new Types.ObjectId();
      const st = makeServiceType({
        _id: serviceTypeId,
        pricePerSession: 80,
        currency: 'AUD',
      });
      const session = makeSession({
        memberIds: [memberId],
        serviceTypeId,
        date: new Date('2024-01-10'), // past date
        status: 'scheduled',
      });

      const sessionRepo = makeSessionRepo({
        findSessionsForBillingRange: jest.fn().mockResolvedValue([session]),
      });
      const stRepo = makeServiceTypeRepo({
        findByIds: jest.fn().mockResolvedValue([st]),
      });
      const svc = new BillingService(sessionRepo, stRepo);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      const result = await svc.getBilling(from, to, new Date('2024-02-01'));

      expect(result.grandTotal).toBe(80);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].totalAmount).toBe(80);
    });

    it('excludes future sessions from billing', async () => {
      const memberId = new Types.ObjectId();
      const serviceTypeId = new Types.ObjectId();
      const st = makeServiceType({ _id: serviceTypeId, pricePerSession: 80 });
      const futureSession = makeSession({
        memberIds: [memberId],
        serviceTypeId,
        date: new Date('2099-12-31'), // future date
        status: 'scheduled',
      });

      const sessionRepo = makeSessionRepo({
        findSessionsForBillingRange: jest
          .fn()
          .mockResolvedValue([futureSession]),
      });
      const stRepo = makeServiceTypeRepo({
        findByIds: jest.fn().mockResolvedValue([st]),
      });
      const svc = new BillingService(sessionRepo, stRepo);

      const result = await svc.getBilling(
        new Date('2099-01-01'),
        new Date('2099-12-31'),
        new Date('2099-06-01'), // now is before the session
      );

      expect(result.grandTotal).toBe(0);
    });
  });
});
