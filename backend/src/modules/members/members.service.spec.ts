import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MembersService } from './members.service';
import { User } from '../../common/models/user.model';
import { BodyTest } from '../../common/models/body-test.model';
import { CheckIn } from '../../common/models/check-in.model';
import { MemberInjury } from '../../common/models/member-injury.model';
import { MemberMedication } from '../../common/models/member-medication.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const OTHER_TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const MEMBER2_ID = new Types.ObjectId().toString();

function makeMember(
  id: string,
  trainerId: string | null,
  firstName = 'John',
  lastName = 'Doe',
  email = 'john@example.com',
) {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email,
    role: 'member',
    trainerId: trainerId ? new Types.ObjectId(trainerId) : null,
  };
}

function makeTrainer(id: string, firstName = 'Trainer', lastName = 'One') {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email: 'trainer@example.com',
    role: 'trainer',
    trainerId: null,
  };
}

describe('MembersService', () => {
  let service: MembersService;
  let userModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };
  let bodyTestModel: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let checkInModel: { findOne: jest.Mock };
  let injuryModel: {
    find: jest.Mock;
  };
  let medicationModel: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    bodyTestModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    checkInModel = {
      findOne: jest.fn(),
    };
    injuryModel = {
      find: jest.fn(),
    };
    medicationModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(BodyTest.name), useValue: bodyTestModel },
        { provide: getModelToken(CheckIn.name), useValue: checkInModel },
        {
          provide: getModelToken(MemberInjury.name),
          useValue: injuryModel,
        },
        {
          provide: getModelToken(MemberMedication.name),
          useValue: medicationModel,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  // ─── listMembers ─────────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('owner role returns all members with name and resolved trainerName (null when unassigned)', async () => {
      const member1 = makeMember(
        MEMBER_ID,
        TRAINER_ID,
        'Alice',
        'Smith',
        'alice@example.com',
      );
      const member2 = makeMember(
        MEMBER2_ID,
        null,
        'Bob',
        'Jones',
        'bob@example.com',
      );
      const trainer = makeTrainer(TRAINER_ID, 'Jane', 'Trainer');

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'member') {
            return Promise.resolve([member1, member2]);
          }
          return Promise.resolve([]);
        },
      );
      userModel.findById.mockResolvedValue(trainer);

      const result = await service.listMembers(OWNER_ID, 'owner');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: MEMBER_ID,
        name: 'Alice Smith',
        email: 'alice@example.com',
        trainerId: TRAINER_ID,
        trainerName: 'Jane Trainer',
      });
      expect(result[1]).toMatchObject({
        id: MEMBER2_ID,
        name: 'Bob Jones',
        email: 'bob@example.com',
        trainerId: null,
        trainerName: null,
      });
    });

    it('trainer role returns only members whose trainerId equals the trainer id', async () => {
      const myMember = makeMember(
        MEMBER_ID,
        TRAINER_ID,
        'Alice',
        'Smith',
        'alice@example.com',
      );
      const trainer = makeTrainer(TRAINER_ID, 'Jane', 'Trainer');

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'member') {
            // Only called with trainerId filter for trainer role
            return Promise.resolve([myMember]);
          }
          return Promise.resolve([]);
        },
      );
      userModel.findById.mockResolvedValue(trainer);

      const result = await service.listMembers(TRAINER_ID, 'trainer');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MEMBER_ID);
      // Verify the query was scoped to the trainer
      const findCall = userModel.find.mock.calls[0] as [
        { trainerId?: Types.ObjectId },
      ];
      expect(findCall[0].trainerId?.toString()).toBe(TRAINER_ID);
    });
  });

  // ─── getOverview ─────────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('returns joinedAt from member.createdAt, latest body-test date, and latest check-in submittedAt (each null when none exist)', async () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const member = {
        ...makeMember(MEMBER_ID, OWNER_ID),
        createdAt: now,
      };
      userModel.findById.mockResolvedValue(member);
      bodyTestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      checkInModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getOverview(MEMBER_ID, OWNER_ID, 'owner');

      expect(result.joinedAt).toEqual(now);
      expect(result.lastBodyTestDate).toBeNull();
      expect(result.lastCheckinDate).toBeNull();
    });

    it('returns the latest body test date and check-in submittedAt when they exist', async () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const bodyTestDate = new Date('2026-02-01T00:00:00Z');
      const checkinDate = new Date('2026-03-01T00:00:00Z');
      const member = {
        ...makeMember(MEMBER_ID, OWNER_ID),
        createdAt: now,
      };
      userModel.findById.mockResolvedValue(member);
      bodyTestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ date: bodyTestDate }),
      });
      checkInModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ submittedAt: checkinDate }),
      });

      const result = await service.getOverview(MEMBER_ID, OWNER_ID, 'owner');

      expect(result.lastBodyTestDate).toEqual(bodyTestDate);
      expect(result.lastCheckinDate).toEqual(checkinDate);
    });

    it('throws NotFoundException when the id is not a member-role user', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.getOverview(MEMBER_ID, OWNER_ID, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the found user does not have role member', async () => {
      userModel.findById.mockResolvedValue({
        ...makeMember(MEMBER_ID, OWNER_ID),
        role: 'trainer',
      });

      await expect(
        service.getOverview(MEMBER_ID, OWNER_ID, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when a trainer requests a member not assigned to them', async () => {
      const member = makeMember(MEMBER_ID, OTHER_TRAINER_ID);
      userModel.findById.mockResolvedValue(member);

      await expect(
        service.getOverview(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getBodyTests ─────────────────────────────────────────────────────────────

  describe('getBodyTests', () => {
    it('returns the member body tests sorted by date desc, scoped to the requesting trainer', async () => {
      const member = makeMember(MEMBER_ID, TRAINER_ID);
      const tests = [
        { _id: 'a', date: new Date('2026-03-01') },
        { _id: 'b', date: new Date('2026-01-01') },
      ];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(tests);
      bodyTestModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getBodyTests(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).toEqual(tests);
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
    });

    it('throws NotFoundException when trainer requests a member not theirs', async () => {
      const member = makeMember(MEMBER_ID, OTHER_TRAINER_ID);
      userModel.findById.mockResolvedValue(member);

      await expect(
        service.getBodyTests(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getInjuries ─────────────────────────────────────────────────────────────

  describe('getInjuries', () => {
    it('returns only active injuries for the member', async () => {
      const member = makeMember(MEMBER_ID, OWNER_ID);
      const injuries = [{ _id: 'inj1', status: 'active', title: 'Knee pain' }];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(injuries);
      injuryModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getInjuries(MEMBER_ID, OWNER_ID, 'owner');

      expect(result).toEqual(injuries);
      const findCall = injuryModel.find.mock.calls[0] as [{ status?: string }];
      expect(findCall[0].status).toBe('active');
    });
  });

  // ─── getMedications ───────────────────────────────────────────────────────────

  describe('getMedications', () => {
    it('returns only active medications for the member', async () => {
      const member = makeMember(MEMBER_ID, OWNER_ID);
      const meds = [{ _id: 'med1', status: 'active', name: 'Aspirin' }];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(meds);
      medicationModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getMedications(MEMBER_ID, OWNER_ID, 'owner');

      expect(result).toEqual(meds);
      const findCall = medicationModel.find.mock.calls[0] as [
        { status?: string },
      ];
      expect(findCall[0].status).toBe('active');
    });
  });
});
