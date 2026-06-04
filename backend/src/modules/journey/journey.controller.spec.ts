import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JourneyController } from './journey.controller';
import { JourneyService, JourneySummary } from './journey.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

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

describe('JourneyController', () => {
  let controller: JourneyController;
  let service: { getSummary: jest.Mock };

  beforeEach(async () => {
    service = {
      getSummary: jest.fn().mockResolvedValue(fakeSummary),
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
});
