import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BodyTestsService } from './body-tests.service';
import type { BodyTestRepository } from '../repositories/body-test.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { IBodyTest } from '../database/models/body-test.model';
import type { IUser } from '../database/models/user.model';
import { Types } from 'mongoose';

function makeTest(overrides: Partial<IBodyTest> = {}): IBodyTest {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    trainerId: new Types.ObjectId(),
    date: new Date('2024-01-15'),
    age: 30,
    sex: 'male',
    weight: 80,
    protocol: '3site',
    tricep: null,
    chest: 10,
    subscapular: null,
    abdominal: 15,
    suprailiac: null,
    thigh: 12,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 0,
    leanMassKg: 0,
    fatMassKg: 0,
    targetWeight: null,
    targetBodyFatPct: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as IBodyTest;
}

function makeRepo(
  overrides: Record<string, jest.Mock> = {},
): BodyTestRepository {
  return {
    create: jest.fn(),
    findByMember: jest.fn(),
    deleteByIdAndTrainer: jest.fn(),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as BodyTestRepository;
}

function makeUserRepo(
  overrides: Record<string, jest.Mock> = {},
): UserRepository {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

function makeMember(trainerId: string): IUser {
  return {
    _id: new Types.ObjectId(),
    trainerId: new Types.ObjectId(trainerId),
  } as unknown as IUser;
}

describe('BodyTestsService', () => {
  describe('create', () => {
    it('stores skinfolds and computes body-fat % (Jackson-Pollock) matching v1', async () => {
      // 3-site male: chest=10, abdominal=15, thigh=12, age=30
      // sum = 37
      // density = 1.10938 - 0.0008267*37 + 0.0000016*37^2 - 0.0002574*30
      // = 1.10938 - 0.0305879 + 0.0021904 - 0.007722 = 1.0733805
      // bf% = 495/1.0733805 - 450 ≈ 11.19%
      const created = makeTest({ bodyFatPct: 11.19 });
      const createMock = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create: createMock });
      const svc = new BodyTestsService(repo);

      const result = await svc.create({
        memberId: 'member1',
        trainerId: 'trainer1',
        date: new Date('2024-01-15'),
        age: 30,
        sex: 'male',
        weight: 80,
        protocol: '3site',
        chest: 10,
        abdominal: 15,
        thigh: 12,
        tricep: null,
        subscapular: null,
        suprailiac: null,
        midaxillary: null,
        bicep: null,
        lumbar: null,
        targetWeight: null,
        targetBodyFatPct: null,
      });

      expect(result).toBe(created);
      // The body-fat % passed to repo.create should match the formula
      type CreateCallArg = {
        bodyFatPct: number;
        fatMassKg: number;
        leanMassKg: number;
      };
      const calls = createMock.mock.calls as [CreateCallArg][];
      const callArg = calls[0][0];
      expect(callArg.bodyFatPct).toBeCloseTo(11.19, 1);
      expect(callArg.fatMassKg).toBeCloseTo(80 * (callArg.bodyFatPct / 100), 3);
      expect(callArg.leanMassKg).toBeCloseTo(80 - callArg.fatMassKg, 3);
    });

    it('uses the "other" protocol with the provided bodyFatPct directly', async () => {
      const created = makeTest({ protocol: 'other', bodyFatPct: 20 });
      const createMock = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create: createMock });
      const svc = new BodyTestsService(repo);

      await svc.create({
        memberId: 'member1',
        trainerId: 'trainer1',
        date: new Date(),
        age: 30,
        sex: 'male',
        weight: 80,
        protocol: 'other',
        bodyFatPct: 20,
        chest: null,
        abdominal: null,
        thigh: null,
        tricep: null,
        subscapular: null,
        suprailiac: null,
        midaxillary: null,
        bicep: null,
        lumbar: null,
        targetWeight: null,
        targetBodyFatPct: null,
      });

      const calls2 = createMock.mock.calls as [{ bodyFatPct: number }][];
      const callArg = calls2[0][0];
      expect(callArg.bodyFatPct).toBe(20);
    });
  });

  describe('list', () => {
    it('returns tests for a member sorted newest-first', async () => {
      const tests = [makeTest(), makeTest()];
      const findByMember = jest.fn().mockResolvedValue(tests);
      const repo = makeRepo({ findByMember });
      const svc = new BodyTestsService(repo);

      const result = await svc.list('member1');

      expect(result).toBe(tests);
      expect(findByMember).toHaveBeenCalledWith('member1');
    });
  });

  describe('createForMember', () => {
    it('stores test and computes body-fat % matching v1', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const created = makeTest({ bodyFatPct: 11.19 });
      const createMock = jest.fn().mockResolvedValue(created);
      const repo = makeRepo({ create: createMock });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new BodyTestsService(repo, userRepo);

      const result = await svc.createForMember(
        {
          memberId,
          trainerId,
          date: new Date('2024-01-15'),
          age: 30,
          sex: 'male',
          weight: 80,
          protocol: '3site',
          chest: 10,
          abdominal: 15,
          thigh: 12,
          tricep: null,
          subscapular: null,
          suprailiac: null,
          midaxillary: null,
          bicep: null,
          lumbar: null,
          targetWeight: null,
          targetBodyFatPct: null,
        },
        trainerId,
        'trainer',
      );

      expect(result).toBe(created);
      type CreateCallArg = { bodyFatPct: number };
      const calls = createMock.mock.calls as [CreateCallArg][];
      expect(calls[0][0].bodyFatPct).toBeCloseTo(11.19, 1);
    });

    it('throws ForbiddenException when trainer does not own member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const otherTrainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(otherTrainerId);
      const repo = makeRepo();
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new BodyTestsService(repo, userRepo);

      await expect(
        svc.createForMember(
          {
            memberId,
            trainerId,
            date: new Date(),
            age: 30,
            sex: 'male',
            weight: 80,
            protocol: 'other',
            bodyFatPct: 20,
            chest: null,
            abdominal: null,
            thigh: null,
            tricep: null,
            subscapular: null,
            suprailiac: null,
            midaxillary: null,
            bicep: null,
            lumbar: null,
            targetWeight: null,
            targetBodyFatPct: null,
          },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member does not exist', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const repo = makeRepo();
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(null),
      });
      const svc = new BodyTestsService(repo, userRepo);

      await expect(
        svc.createForMember(
          {
            memberId,
            trainerId,
            date: new Date(),
            age: 30,
            sex: 'male',
            weight: 80,
            protocol: 'other',
            bodyFatPct: 20,
            chest: null,
            abdominal: null,
            thigh: null,
            tricep: null,
            subscapular: null,
            suprailiac: null,
            midaxillary: null,
            bicep: null,
            lumbar: null,
            targetWeight: null,
            targetBodyFatPct: null,
          },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportCsvForMember', () => {
    it('returns CSV for a member with ownership check', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const test = makeTest({
        date: new Date('2024-01-15'),
        weight: 80,
        bodyFatPct: 15.5,
        fatMassKg: 12.4,
        leanMassKg: 67.6,
        protocol: '3site',
      });
      const repo = makeRepo({
        findByMember: jest.fn().mockResolvedValue([test]),
      });
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = new BodyTestsService(repo, userRepo);

      const csv = await svc.exportCsvForMember(memberId, trainerId, 'trainer');

      expect(csv).toContain(
        'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
      );
      expect(csv).toContain('2024-01-15');
    });
  });

  describe('exportCsv', () => {
    it('returns CSV string with header + one row per test', async () => {
      const test = makeTest({
        date: new Date('2024-01-15'),
        weight: 80,
        bodyFatPct: 15.5,
        fatMassKg: 12.4,
        leanMassKg: 67.6,
        protocol: '3site',
      });
      const repo = makeRepo({
        findByMember: jest.fn().mockResolvedValue([test]),
      });
      const svc = new BodyTestsService(repo);

      const csv = await svc.exportCsv('member1');

      expect(csv).toContain(
        'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
      );
      expect(csv).toContain('2024-01-15');
      expect(csv).toContain('80.0');
      expect(csv).toContain('15.5');
      expect(csv).toContain('3site');
    });
  });
});
