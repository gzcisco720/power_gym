import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrainersService } from './trainers.service';
import { User } from '../../common/models/user.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const TRAINER2_ID = new Types.ObjectId().toString();
const MEMBER1_ID = new Types.ObjectId().toString();
const MEMBER2_ID = new Types.ObjectId().toString();

function makeTrainer(
  id: string,
  firstName = 'Jane',
  lastName = 'Smith',
  email = 'jane@example.com',
  createdAt = new Date('2025-01-01T00:00:00Z'),
) {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email,
    role: 'trainer',
    trainerId: null,
    createdAt,
  };
}

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

describe('TrainersService', () => {
  let service: TrainersService;
  let userModel: {
    find: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainersService,
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<TrainersService>(TrainersService);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all role=trainer users mapped to {id, name, email, memberCount}', async () => {
      const trainer1 = makeTrainer(
        TRAINER_ID,
        'Jane',
        'Smith',
        'jane@example.com',
      );
      const trainer2 = makeTrainer(
        TRAINER2_ID,
        'Bob',
        'Jones',
        'bob@example.com',
      );
      const member1 = makeMember(MEMBER1_ID, TRAINER_ID);
      const member2 = makeMember(MEMBER2_ID, TRAINER_ID);

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'trainer')
            return Promise.resolve([trainer1, trainer2]);
          if (
            query.role === 'member' &&
            query.trainerId?.toString() === TRAINER_ID
          ) {
            return Promise.resolve([member1, member2]);
          }
          if (
            query.role === 'member' &&
            query.trainerId?.toString() === TRAINER2_ID
          ) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        },
      );

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: TRAINER_ID,
        name: 'Jane Smith',
        email: 'jane@example.com',
        memberCount: 2,
      });
      expect(result[1]).toMatchObject({
        id: TRAINER2_ID,
        name: 'Bob Jones',
        email: 'bob@example.com',
        memberCount: 0,
      });
    });

    it('returns memberCount of 0 for a trainer with no assigned members', async () => {
      const trainer = makeTrainer(TRAINER_ID);

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'trainer') return Promise.resolve([trainer]);
          if (query.role === 'member') return Promise.resolve([]);
          return Promise.resolve([]);
        },
      );

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].memberCount).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns trainer detail with members list, joinDate, and memberCount', async () => {
      const joinDate = new Date('2025-03-15T10:00:00Z');
      const trainer = makeTrainer(
        TRAINER_ID,
        'Jane',
        'Smith',
        'jane@example.com',
        joinDate,
      );
      const member1 = makeMember(
        MEMBER1_ID,
        TRAINER_ID,
        'Alice',
        'Lee',
        'alice@example.com',
      );
      const member2 = makeMember(
        MEMBER2_ID,
        TRAINER_ID,
        'Tom',
        'Brown',
        'tom@example.com',
      );

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });
      userModel.find.mockResolvedValue([member1, member2]);

      const result = await service.findOne(TRAINER_ID);

      expect(result).toMatchObject({
        id: TRAINER_ID,
        name: 'Jane Smith',
        email: 'jane@example.com',
        memberCount: 2,
        joinDate: joinDate.toISOString(),
      });
      expect(result.members).toHaveLength(2);
      expect(result.members[0]).toMatchObject({
        id: MEMBER1_ID,
        name: 'Alice Lee',
        email: 'alice@example.com',
      });
      expect(result.members[1]).toMatchObject({
        id: MEMBER2_ID,
        name: 'Tom Brown',
        email: 'tom@example.com',
      });
    });

    it('throws NotFoundException when id is not a trainer', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when found user has a non-trainer role', async () => {
      const member = makeMember(MEMBER1_ID, null);
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(member),
      });

      await expect(service.findOne(MEMBER1_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
