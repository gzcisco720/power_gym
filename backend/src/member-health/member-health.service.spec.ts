import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberHealthService } from './member-health.service';
import type { MemberInjuryRepository } from '../repositories/member-injury.repository';
import type { MemberMedicalHistoryRepository } from '../repositories/member-medical-history.repository';
import type { MemberMedicationRepository } from '../repositories/member-medication.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { IMemberInjury } from '../database/models/member-injury.model';
import type { IMemberMedicalHistory } from '../database/models/member-medical-history.model';
import type { IMemberMedication } from '../database/models/member-medication.model';
import type { IUser } from '../database/models/user.model';
import { Types } from 'mongoose';

function makeInjury(overrides: Partial<IMemberInjury> = {}): IMemberInjury {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    title: 'Knee pain',
    status: 'active',
    recordedAt: new Date(),
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: null,
    injuryType: null,
    bodyPart: null,
    bodySide: null,
    painAtRest: null,
    painDuringExercise: null,
    mechanism: null,
    aggravatingFactors: null,
    relievingFactors: null,
    seenDoctor: false,
    doctorRestrictions: null,
    rehabilitationStatus: null,
    resolvedAt: null,
    createdByRole: 'trainer',
    createdAt: new Date(),
    ...overrides,
  } as unknown as IMemberInjury;
}

function makeMedicalHistory(
  overrides: Partial<IMemberMedicalHistory> = {},
): IMemberMedicalHistory {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    chronicConditions: [],
    surgeries: null,
    allergies: null,
    familyHistory: null,
    currentDoctor: null,
    emergencyContact: null,
    pregnancyStatus: null,
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IMemberMedicalHistory;
}

function makeMedication(
  overrides: Partial<IMemberMedication> = {},
): IMemberMedication {
  return {
    _id: new Types.ObjectId(),
    memberId: new Types.ObjectId(),
    name: 'Ibuprofen',
    purpose: 'Pain relief',
    duration: 'short_term',
    startDate: new Date(),
    endDate: null,
    notes: null,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  } as unknown as IMemberMedication;
}

function makeMember(trainerId: string): IUser {
  return {
    _id: new Types.ObjectId(),
    trainerId: new Types.ObjectId(trainerId),
  } as unknown as IUser;
}

function makeInjuryRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberInjuryRepository {
  return {
    findByMember: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as MemberInjuryRepository;
}

function makeMedHistoryRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberMedicalHistoryRepository {
  return {
    findByMember: jest.fn(),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as MemberMedicalHistoryRepository;
}

function makeMedRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberMedicationRepository {
  return {
    findByMember: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    ...overrides,
  } as unknown as MemberMedicationRepository;
}

function makeUserRepo(
  overrides: Record<string, jest.Mock> = {},
): UserRepository {
  return {
    findById: jest.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

function makeSvc(
  injuryRepo: MemberInjuryRepository = makeInjuryRepo(),
  medHistRepo: MemberMedicalHistoryRepository = makeMedHistoryRepo(),
  medRepo: MemberMedicationRepository = makeMedRepo(),
  userRepo: UserRepository = makeUserRepo(),
): MemberHealthService {
  return new MemberHealthService(injuryRepo, medHistRepo, medRepo, userRepo);
}

describe('MemberHealthService', () => {
  describe('addInjury', () => {
    it('persists injury linked to member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const injury = makeInjury();
      const createMock = jest.fn().mockResolvedValue(injury);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const injuryRepo = makeInjuryRepo({ create: createMock });
      const svc = makeSvc(injuryRepo, undefined, undefined, userRepo);

      const result = await svc.addInjury(
        memberId,
        { title: 'Knee pain', createdByRole: 'trainer' },
        trainerId,
        'trainer',
      );

      expect(result).toBe(injury);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ memberId, title: 'Knee pain' }),
      );
    });

    it('throws ForbiddenException when trainer does not own member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const otherTrainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(otherTrainerId);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = makeSvc(undefined, undefined, undefined, userRepo);

      await expect(
        svc.addInjury(
          memberId,
          { title: 'Test', createdByRole: 'trainer' },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMedicalHistory', () => {
    it("upserts the member's medical history", async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const history = makeMedicalHistory();
      const upsertMock = jest.fn().mockResolvedValue(history);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const medHistRepo = makeMedHistoryRepo({ upsert: upsertMock });
      const svc = makeSvc(undefined, medHistRepo, undefined, userRepo);

      const result = await svc.updateMedicalHistory(
        memberId,
        { chronicConditions: ['asthma'] },
        trainerId,
        'trainer',
      );

      expect(result).toBe(history);
      expect(upsertMock).toHaveBeenCalledWith(memberId, {
        chronicConditions: ['asthma'],
      });
    });

    it("throws ForbiddenException when member tries to update another member's history", async () => {
      const memberId = new Types.ObjectId().toString();
      const otherMemberId = new Types.ObjectId().toString();
      const svc = makeSvc();

      await expect(
        svc.updateMedicalHistory(otherMemberId, {}, memberId, 'member'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listInjuries', () => {
    it('returns injuries for a member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const injuries = [makeInjury()];
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const injuryRepo = makeInjuryRepo({
        findByMember: jest.fn().mockResolvedValue(injuries),
      });
      const svc = makeSvc(injuryRepo, undefined, undefined, userRepo);

      const result = await svc.listInjuries(memberId, trainerId, 'trainer');

      expect(result).toBe(injuries);
    });
  });

  describe('getMedicalHistory', () => {
    it('returns medical history for a member', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const history = makeMedicalHistory();
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const medHistRepo = makeMedHistoryRepo({
        findByMember: jest.fn().mockResolvedValue(history),
      });
      const svc = makeSvc(undefined, medHistRepo, undefined, userRepo);

      const result = await svc.getMedicalHistory(
        memberId,
        trainerId,
        'trainer',
      );

      expect(result).toBe(history);
    });
  });

  describe('addMedication', () => {
    it('throws ForbiddenException when non-member tries to add medication', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const svc = makeSvc(undefined, undefined, undefined, userRepo);

      await expect(
        svc.addMedication(
          memberId,
          {
            name: 'Test',
            purpose: 'Test',
            duration: 'short_term',
            startDate: new Date(),
          },
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('persists medication when member self-submits', async () => {
      const memberId = new Types.ObjectId().toString();
      const med = makeMedication();
      const createMock = jest.fn().mockResolvedValue(med);
      const medRepo = makeMedRepo({ create: createMock });
      const svc = makeSvc(undefined, undefined, medRepo, makeUserRepo());

      const result = await svc.addMedication(
        memberId,
        {
          name: 'Ibuprofen',
          purpose: 'Pain',
          duration: 'short_term',
          startDate: new Date(),
        },
        memberId,
        'member',
      );

      expect(result).toBe(med);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ memberId, name: 'Ibuprofen' }),
      );
    });
  });

  describe('listMedications', () => {
    it('returns medications for a member', async () => {
      const memberId = new Types.ObjectId().toString();
      const meds = [makeMedication()];
      const medRepo = makeMedRepo({
        findByMember: jest.fn().mockResolvedValue(meds),
      });
      const svc = makeSvc(undefined, undefined, medRepo, makeUserRepo());

      const result = await svc.listMedications(memberId, memberId, 'member');

      expect(result).toBe(meds);
    });
  });

  describe('updateInjury', () => {
    it('throws NotFoundException when injury not found', async () => {
      const trainerId = new Types.ObjectId().toString();
      const memberId = new Types.ObjectId().toString();
      const member = makeMember(trainerId);
      const userRepo = makeUserRepo({
        findById: jest.fn().mockResolvedValue(member),
      });
      const injuryRepo = makeInjuryRepo({
        update: jest.fn().mockResolvedValue(null),
      });
      const svc = makeSvc(injuryRepo, undefined, undefined, userRepo);

      await expect(
        svc.updateInjury(
          memberId,
          new Types.ObjectId().toString(),
          {},
          trainerId,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
