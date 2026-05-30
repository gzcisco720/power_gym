import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import type { CheckInRepository } from '../repositories/check-in.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { ICheckIn } from '../database/models/check-in.model';
import type { IUser } from '../database/models/user.model';
import { Types } from 'mongoose';

function makeCheckIn(overrides: Partial<ICheckIn> = {}): ICheckIn {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    trainerId: new Types.ObjectId(),
    submittedAt: new Date(),
    sleepQuality: 7,
    stress: 4,
    fatigue: 5,
    hunger: 6,
    recovery: 7,
    energy: 8,
    digestion: 7,
    weight: null,
    waist: null,
    steps: null,
    exerciseMinutes: null,
    walkRunDistance: null,
    sleepHours: null,
    dietDetails: '',
    stuckToDiet: 'yes',
    wellbeing: '',
    notes: '',
    photos: [],
    createdAt: new Date(),
    ...overrides,
  } as unknown as ICheckIn;
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
): CheckInRepository {
  return {
    create: jest.fn(),
    findByMember: jest.fn(),
    countSince: jest.fn(),
    existsForDay: jest.fn(),
    ...overrides,
  } as unknown as CheckInRepository;
}

function makeUserRepo(
  overrides: Record<string, jest.Mock> = {},
): UserRepository {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

describe('CheckInsService', () => {
  describe('list', () => {
    it("returns the member's check-ins newest-first", async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const checkIns = [
        makeCheckIn({ submittedAt: new Date('2024-02-01') }),
        makeCheckIn({ submittedAt: new Date('2024-01-01') }),
      ];
      const findByMember = jest.fn().mockResolvedValue(checkIns);
      const repo = makeRepo({ findByMember });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInsService(repo, userRepo);

      const result = await svc.list(memberId, trainerId, 'trainer');

      expect(result).toBe(checkIns);
      expect(findByMember).toHaveBeenCalledWith(memberId);
    });

    it('allows member to list own check-ins', async () => {
      const memberId = new Types.ObjectId().toString();
      const checkIns = [makeCheckIn()];
      const findByMember = jest.fn().mockResolvedValue(checkIns);
      const repo = makeRepo({ findByMember });
      const svc = new CheckInsService(repo, makeUserRepo());

      const result = await svc.list(memberId, memberId, 'member');

      expect(result).toBe(checkIns);
    });

    it('throws ForbiddenException when trainer does not own member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const otherTrainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(otherTrainerId);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInsService(makeRepo(), userRepo);

      await expect(svc.list(memberId, trainerId, 'trainer')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    it('creates a check-in for the member', async () => {
      const memberId = new Types.ObjectId().toString();
      const trainerId = new Types.ObjectId().toString();
      const member = {
        _id: new Types.ObjectId(memberId),
        trainerId: new Types.ObjectId(trainerId),
        role: 'member',
      } as unknown as IUser;
      const created = makeCheckIn();
      const createMock = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create: createMock });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new CheckInsService(repo, userRepo);

      const result = await svc.create(memberId, {
        submittedAt: new Date(),
        sleepQuality: 7,
        stress: 4,
        fatigue: 5,
        hunger: 6,
        recovery: 7,
        energy: 8,
        digestion: 7,
        weight: null,
        waist: null,
        steps: null,
        exerciseMinutes: null,
        walkRunDistance: null,
        sleepHours: null,
        dietDetails: '',
        stuckToDiet: 'yes',
        wellbeing: '',
        notes: '',
        photos: [],
      });

      expect(result).toBe(created);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ memberId, trainerId }),
      );
    });
  });
});
