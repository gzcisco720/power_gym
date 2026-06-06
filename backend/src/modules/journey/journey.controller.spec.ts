import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JourneyController } from './journey.controller';
import {
  JourneyService,
  JourneySummary,
  JourneyTimelinePage,
} from './journey.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { JourneyTimelineQueryDto } from './dto/journey-timeline.dto';

interface RequestWithUser {
  user: JwtUser;
}

const MEMBER_ID = new Types.ObjectId().toString();

const memberUser: JwtUser = {
  sub: MEMBER_ID,
  role: 'member',
  firstName: 'Test',
  lastName: 'Member',
  trainerId: null,
};

const fakeSummary: JourneySummary = {
  workoutStreak: 3,
  recentSessions: [],
  nutritionDays: [],
  bodyTests: [],
};

const fakeTimelinePage: JourneyTimelinePage = {
  items: [
    {
      id: 'abc',
      type: 'session_completed',
      date: '2024-01-10T10:00:00.000Z',
      dayName: 'Day 1',
      completedSetCount: 3,
    },
  ],
  nextCursor: null,
};

describe('JourneyController', () => {
  let controller: JourneyController;
  let service: { getSummary: jest.Mock; getTimeline: jest.Mock };

  beforeEach(async () => {
    service = {
      getSummary: jest.fn().mockResolvedValue(fakeSummary),
      getTimeline: jest.fn().mockResolvedValue(fakeTimelinePage),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JourneyController],
      providers: [{ provide: JourneyService, useValue: service }],
    }).compile();

    controller = module.get<JourneyController>(JourneyController);
  });

  describe('getMyJourney', () => {
    it('calls service.getSummary with req.user.sub and returns its result', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      const result = await controller.getMyJourney(req);

      expect(service.getSummary).toHaveBeenCalledWith(MEMBER_ID);
      expect(result).toEqual(fakeSummary);
    });
  });

  describe('getMyTimeline', () => {
    it('calls service.getTimeline with req.user.sub and the query params, returns the page', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const query: JourneyTimelineQueryDto = { limit: 5 };

      const result = await controller.getMyTimeline(req, query);

      expect(service.getTimeline).toHaveBeenCalledWith(MEMBER_ID, {
        cursor: undefined,
        limit: 5,
      });
      expect(result).toEqual(fakeTimelinePage);
    });

    it('passes cursor to service when provided', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const query: JourneyTimelineQueryDto = {
        cursor: '2024-01-05T00:00:00.000Z',
        limit: 10,
      };

      await controller.getMyTimeline(req, query);

      expect(service.getTimeline).toHaveBeenCalledWith(MEMBER_ID, {
        cursor: '2024-01-05T00:00:00.000Z',
        limit: 10,
      });
    });
  });
});
