import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { User } from '../../common/models/user.model';
import { ServiceType } from '../../common/models/service-type.model';

const MEMBER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const SERVICE_TYPE_ID = new Types.ObjectId().toString();
const SESSION_ID = new Types.ObjectId().toString();

function makeSession(
  overrides: Partial<{
    trainerId: Types.ObjectId;
    serviceTypeId: Types.ObjectId | null;
    customServiceName: string | null;
    seriesId: Types.ObjectId | null;
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
  let sessionModel: { find: jest.Mock };
  let userModel: { findById: jest.Mock };
  let serviceTypeModel: { findById: jest.Mock };

  beforeEach(async () => {
    sessionModel = {
      find: jest.fn(),
    };
    userModel = {
      findById: jest.fn(),
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
});
