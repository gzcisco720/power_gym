import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { User } from '../../common/models/user.model';
import { ServiceType } from '../../common/models/service-type.model';

const MEMBER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const TRAINER2_ID = new Types.ObjectId().toString();
const SERVICE_TYPE_ID = new Types.ObjectId().toString();
const SESSION_ID = new Types.ObjectId().toString();
const SESSION2_ID = new Types.ObjectId().toString();

function makeSession(
  overrides: Partial<{
    _id: Types.ObjectId;
    trainerId: Types.ObjectId;
    memberIds: Types.ObjectId[];
    serviceTypeId: Types.ObjectId | null;
    customServiceName: string | null;
    seriesId: Types.ObjectId | null;
    date: Date;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'cancelled';
  }> = {},
) {
  return {
    _id: new Types.ObjectId(SESSION_ID),
    trainerId: new Types.ObjectId(TRAINER_ID),
    memberIds: [new Types.ObjectId(MEMBER_ID)],
    date: new Date('2026-07-01'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled' as const,
    serviceTypeId: null,
    customServiceName: null,
    seriesId: null,
    ...overrides,
  };
}

describe('ScheduledSessionsService', () => {
  let service: ScheduledSessionsService;
  let sessionModel: {
    find: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  let userModel: { findById: jest.Mock; find: jest.Mock };
  let serviceTypeModel: { findById: jest.Mock };

  beforeEach(async () => {
    sessionModel = {
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    };
    userModel = {
      findById: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    serviceTypeModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledSessionsService,
        {
          provide: getModelToken(ScheduledSession.name),
          useValue: sessionModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(ServiceType.name),
          useValue: serviceTypeModel,
        },
      ],
    }).compile();

    service = module.get<ScheduledSessionsService>(ScheduledSessionsService);
  });

  // ─── findForMember ─────────────────────────────────────────────────────────

  describe('findForMember', () => {
    it('queries sessions where memberIds contains the member id and sorts by date ascending', async () => {
      const sessions = [makeSession()];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      serviceTypeModel.findById.mockResolvedValue(null);

      await service.findForMember(MEMBER_ID);

      expect(sessionModel.find).toHaveBeenCalledWith({
        memberIds: new Types.ObjectId(MEMBER_ID),
      });
      expect(sortMock).toHaveBeenCalledWith({ date: 1 });
    });

    it('resolves trainerName from the User model (firstName + lastName)', async () => {
      const sessions = [makeSession()];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({
        firstName: 'Alice',
        lastName: 'Smith',
      });
      serviceTypeModel.findById.mockResolvedValue(null);

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].trainerName).toBe('Alice Smith');
    });

    it('falls back to "Trainer" when the trainer user is not found', async () => {
      const sessions = [makeSession()];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue(null);
      serviceTypeModel.findById.mockResolvedValue(null);

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].trainerName).toBe('Trainer');
    });

    it('sets serviceTypeName from ServiceType when serviceTypeId is set', async () => {
      const sessions = [
        makeSession({ serviceTypeId: new Types.ObjectId(SERVICE_TYPE_ID) }),
      ];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });
      serviceTypeModel.findById.mockResolvedValue({
        name: 'Personal Training',
      });

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].serviceTypeName).toBe('Personal Training');
    });

    it('sets serviceTypeName from customServiceName when serviceTypeId is null but customServiceName is set', async () => {
      const sessions = [
        makeSession({
          serviceTypeId: null,
          customServiceName: 'Custom Session',
        }),
      ];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].serviceTypeName).toBe('Custom Session');
    });

    it('sets serviceTypeName to null when neither serviceTypeId nor customServiceName is set', async () => {
      const sessions = [
        makeSession({ serviceTypeId: null, customServiceName: null }),
      ];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].serviceTypeName).toBeNull();
    });

    it('sets isRecurring true when seriesId is non-null and false when null', async () => {
      const seriesId = new Types.ObjectId();
      const sessions = [
        makeSession({ seriesId }),
        makeSession({ seriesId: null }),
      ];
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });
      serviceTypeModel.findById.mockResolvedValue(null);

      const result = await service.findForMember(MEMBER_ID);

      expect(result[0].isRecurring).toBe(true);
      expect(result[1].isRecurring).toBe(false);
    });
  });

  // ─── listForStaff ──────────────────────────────────────────────────────────

  describe('listForStaff', () => {
    function makeSortedFindMock(sessions: ReturnType<typeof makeSession>[]) {
      const sortMock = jest.fn().mockResolvedValue(sessions);
      sessionModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      userModel.find.mockResolvedValue([]);
      serviceTypeModel.findById.mockResolvedValue(null);
      return sortMock;
    }

    it('owner receives sessions for all trainers (no trainerId filter)', async () => {
      const sessions = [
        makeSession({ trainerId: new Types.ObjectId(TRAINER_ID) }),
        makeSession({
          _id: new Types.ObjectId(SESSION2_ID),
          trainerId: new Types.ObjectId(TRAINER2_ID),
        }),
      ];
      makeSortedFindMock(sessions);

      await service.listForStaff('owner', undefined, 'upcoming');

      // Owner should not filter by trainerId — only date filter expected
      const ownerQuery = sessionModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(Object.keys(ownerQuery[0])).not.toContain('trainerId');
    });

    it('trainer receives only own-trainer sessions', async () => {
      const sessions = [
        makeSession({ trainerId: new Types.ObjectId(TRAINER_ID) }),
      ];
      makeSortedFindMock(sessions);

      await service.listForStaff('trainer', TRAINER_ID, 'upcoming');

      expect(sessionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          trainerId: new Types.ObjectId(TRAINER_ID),
        }),
      );
    });

    it('range=upcoming excludes sessions before today; range=past includes them', async () => {
      makeSortedFindMock([]);

      await service.listForStaff('owner', undefined, 'upcoming');
      const upcomingCall = sessionModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      const upcomingDate = upcomingCall[0]['date'] as Record<string, unknown>;
      expect(Object.keys(upcomingDate)).toContain('$gte');
      expect(upcomingDate['$gte']).toBeInstanceOf(Date);

      sessionModel.find.mockClear();
      makeSortedFindMock([]);

      await service.listForStaff('owner', undefined, 'past');
      const pastCall = sessionModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      const pastDate = pastCall[0]['date'] as Record<string, unknown>;
      expect(Object.keys(pastDate)).toContain('$lt');
      expect(pastDate['$lt']).toBeInstanceOf(Date);
    });
  });

  // ─── createSession ─────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('one-off creates exactly one doc with seriesId null and resolved trainerId', async () => {
      const created = makeSession();
      sessionModel.create.mockResolvedValue(created);
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      userModel.find.mockResolvedValue([]);
      serviceTypeModel.findById.mockResolvedValue(null);

      const result = await service.createSession(
        {
          date: '2026-07-01T00:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [MEMBER_ID],
        },
        'owner',
        TRAINER_ID,
      );

      expect(sessionModel.create).toHaveBeenCalledTimes(1);
      const createCalls = sessionModel.create.mock.calls as Array<
        [Record<string, unknown>]
      >;
      expect(createCalls[0][0]['seriesId']).toBeNull();
      expect(result).toHaveLength(1);
    });

    it('recurrence weeks=4 creates 4 docs sharing one seriesId, dates 7 days apart', async () => {
      const created = makeSession();
      sessionModel.create.mockResolvedValue(created);
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      userModel.find.mockResolvedValue([]);
      serviceTypeModel.findById.mockResolvedValue(null);

      const result = await service.createSession(
        {
          date: '2026-07-01T00:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [MEMBER_ID],
          recurrence: { weeks: 4 },
        },
        'owner',
        TRAINER_ID,
      );

      expect(sessionModel.create).toHaveBeenCalledTimes(4);
      // All calls share the same seriesId
      const createCallsRecurrence = sessionModel.create.mock.calls as Array<
        [Record<string, unknown>]
      >;
      const seriesIds = createCallsRecurrence.map((c) =>
        (c[0]['seriesId'] as { toString(): string } | null)?.toString(),
      );
      expect(new Set(seriesIds).size).toBe(1);
      expect(seriesIds[0]).not.toBeNull();

      // Dates are 7 days apart
      const dates = createCallsRecurrence.map(
        (c) => new Date(c[0]['date'] as string),
      );
      for (let i = 1; i < dates.length; i++) {
        const diff =
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(diff).toBe(7);
      }

      expect(result).toHaveLength(4);
    });

    it('trainer caller forces trainerId to self even if body sets another', async () => {
      const created = makeSession({
        trainerId: new Types.ObjectId(TRAINER_ID),
      });
      sessionModel.create.mockResolvedValue(created);
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      userModel.find.mockResolvedValue([]);
      serviceTypeModel.findById.mockResolvedValue(null);

      await service.createSession(
        {
          date: '2026-07-01T00:00:00.000Z',
          startTime: '09:00',
          endTime: '10:00',
          memberIds: [MEMBER_ID],
          trainerId: TRAINER2_ID,
        },
        'trainer',
        TRAINER_ID,
      );

      const trainerCalls = sessionModel.create.mock.calls as Array<
        [Record<string, unknown>]
      >;
      expect(
        (trainerCalls[0][0]['trainerId'] as { toString(): string }).toString(),
      ).toBe(TRAINER_ID);
    });
  });

  // ─── updateSession ─────────────────────────────────────────────────────────

  describe('updateSession', () => {
    it('scope=single edits only the targeted doc', async () => {
      const session = makeSession({
        trainerId: new Types.ObjectId(TRAINER_ID),
        seriesId: new Types.ObjectId(),
      });
      sessionModel.findById.mockResolvedValue(session);
      const saveMock = jest
        .fn()
        .mockResolvedValue({ ...session, startTime: '10:00' });
      const sessionWithSave = { ...session, save: saveMock };
      sessionModel.findById.mockResolvedValue(sessionWithSave);
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      serviceTypeModel.findById.mockResolvedValue(null);
      userModel.find.mockResolvedValue([]);

      await service.updateSession(
        SESSION_ID,
        { startTime: '10:00', scope: 'single' },
        'owner',
        TRAINER_ID,
      );

      expect(sessionModel.updateMany).not.toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });

    it('scope=series edits all docs sharing seriesId', async () => {
      const seriesId = new Types.ObjectId();
      const session = makeSession({
        trainerId: new Types.ObjectId(TRAINER_ID),
        seriesId,
      });
      const sessionWithSave = {
        ...session,
        save: jest.fn().mockResolvedValue(session),
      };
      sessionModel.findById.mockResolvedValue(sessionWithSave);
      sessionModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      userModel.findById.mockResolvedValue({ firstName: 'T', lastName: 'R' });
      serviceTypeModel.findById.mockResolvedValue(null);
      userModel.find.mockResolvedValue([]);

      // Return updated session after updateMany
      const sortMock = jest.fn().mockResolvedValue([session]);
      sessionModel.find.mockReturnValue({ sort: sortMock });

      await service.updateSession(
        SESSION_ID,
        { startTime: '10:00', scope: 'series' },
        'owner',
        TRAINER_ID,
      );

      expect(sessionModel.updateMany).toHaveBeenCalledWith(
        { seriesId },
        expect.objectContaining({ startTime: '10:00' }),
      );
    });

    it('throws NotFoundException when id does not exist', async () => {
      sessionModel.findById.mockResolvedValue(null);

      await expect(
        service.updateSession(
          SESSION_ID,
          { startTime: '10:00' },
          'owner',
          TRAINER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('trainer throws ForbiddenException editing another trainer session', async () => {
      const session = makeSession({
        trainerId: new Types.ObjectId(TRAINER2_ID),
      });
      sessionModel.findById.mockResolvedValue({ ...session, save: jest.fn() });

      await expect(
        service.updateSession(
          SESSION_ID,
          { startTime: '10:00' },
          'trainer',
          TRAINER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('scope=single removes only the targeted doc; scope=series removes all in the series', async () => {
      const seriesId = new Types.ObjectId();
      const session = makeSession({
        trainerId: new Types.ObjectId(TRAINER_ID),
        seriesId,
      });
      sessionModel.findById.mockResolvedValue(session);
      sessionModel.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // single
      await service.deleteSession(SESSION_ID, 'single', 'owner', TRAINER_ID);
      expect(sessionModel.deleteMany).toHaveBeenCalledWith({
        _id: new Types.ObjectId(SESSION_ID),
      });

      sessionModel.deleteMany.mockClear();

      // series
      sessionModel.findById.mockResolvedValue(session);
      await service.deleteSession(SESSION_ID, 'series', 'owner', TRAINER_ID);
      expect(sessionModel.deleteMany).toHaveBeenCalledWith({ seriesId });
    });
  });
});
