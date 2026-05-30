import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CheckInConfigService } from './check-in-config.service';
import type { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { ICheckInConfig } from '../database/models/check-in-config.model';
import type { IUser } from '../database/models/user.model';
import { Types } from 'mongoose';

function makeConfig(overrides: Partial<ICheckInConfig> = {}): ICheckInConfig {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    trainerId: new Types.ObjectId(),
    dayOfWeek: 1,
    hour: 9,
    minute: 0,
    active: true,
    lastReminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ICheckInConfig;
}

function makeMember(trainerId: string): IUser {
  return {
    _id: new Types.ObjectId(),
    trainerId: new Types.ObjectId(trainerId),
    role: 'member',
  } as unknown as IUser;
}

function makeRepo(
  overrides: Record<string, jest.Mock> = {},
): CheckInConfigRepository {
  return {
    upsert: jest.fn(),
    findByMember: jest.fn(),
    findDueForReminder: jest.fn(),
    markReminderSent: jest.fn(),
    ...overrides,
  } as unknown as CheckInConfigRepository;
}

function makeUserRepo(
  overrides: Record<string, jest.Mock> = {},
): UserRepository {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

describe('CheckInConfigService', () => {
  describe('upsert', () => {
    it('stores schedule config for the member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const config = makeConfig();
      const upsertMock = jest.fn().mockResolvedValue(config);
      const repo = makeRepo({ upsert: upsertMock });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInConfigService(repo, userRepo);

      const result = await svc.upsert(
        memberId,
        { dayOfWeek: 1, hour: 9, minute: 0, active: true },
        trainerId,
        'trainer',
      );

      expect(result).toBe(config);
      expect(upsertMock).toHaveBeenCalledWith(memberId, trainerId, {
        dayOfWeek: 1,
        hour: 9,
        minute: 0,
        active: true,
      });
    });

    it('throws ForbiddenException when trainer does not own member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const otherTrainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(otherTrainerId);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInConfigService(makeRepo(), userRepo);

      await expect(
        svc.upsert(
          memberId,
          { dayOfWeek: 1, hour: 9, minute: 0, active: true },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member not found', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(null),
      });
      const svc = new CheckInConfigService(makeRepo(), userRepo);

      await expect(
        svc.upsert(
          memberId,
          { dayOfWeek: 1, hour: 9, minute: 0, active: true },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('get', () => {
    it('returns config for member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const config = makeConfig();
      const repo = makeRepo({
        findByMember: jest.fn().mockResolvedValue(config),
      });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInConfigService(repo, userRepo);

      const result = await svc.get(memberId, trainerId, 'trainer');

      expect(result).toBe(config);
    });
  });
});
