import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CheckInsService } from './check-ins.service';
import { CheckIn } from '../../common/models/check-in.model';
import { User } from '../../common/models/user.model';

const MEMBER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();

const validDto = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  stuckToDiet: 'yes' as const,
};

describe('CheckInsService', () => {
  let service: CheckInsService;
  let checkInModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    sort: jest.Mock;
  };
  let userModel: { findById: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    checkInModel = {
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      findOne: jest.fn(),
      create: jest.fn(),
      sort: sortMock,
    };
    userModel = {
      findById: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        { provide: getModelToken(CheckIn.name), useValue: checkInModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CheckInsService>(CheckInsService);
  });

  describe('findByMember', () => {
    it('returns the member check-ins sorted by submittedAt descending', async () => {
      const fakeItems = [{ _id: 'a' }, { _id: 'b' }];
      const sortMock = jest.fn().mockResolvedValue(fakeItems);
      checkInModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findByMember(MEMBER_ID);

      expect(checkInModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
      });
      expect(sortMock).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(result).toEqual(fakeItems);
    });
  });

  describe('create', () => {
    it('looks up the User and stamps trainerId from the user document trainerId field', async () => {
      const trainerObjId = new Types.ObjectId(TRAINER_ID);
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(MEMBER_ID),
        trainerId: trainerObjId,
      });
      checkInModel.findOne = jest.fn().mockResolvedValue(null);
      const saved = { _id: 'new-id', memberId: MEMBER_ID };
      checkInModel.create.mockResolvedValue(saved);

      const result = await service.create(validDto, MEMBER_ID);

      expect(userModel.findById).toHaveBeenCalledWith(MEMBER_ID);
      expect(checkInModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trainerId: trainerObjId,
          memberId: new Types.ObjectId(MEMBER_ID),
        }),
      );
      expect(result).toEqual(saved);
    });

    it('throws NotFoundException when the member User does not exist', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.create(validDto, MEMBER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when a check-in already exists with submittedAt >= current Monday 00:00', async () => {
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(MEMBER_ID),
        trainerId: new Types.ObjectId(TRAINER_ID),
      });
      checkInModel.findOne = jest.fn().mockResolvedValue({ _id: 'existing' });

      await expect(service.create(validDto, MEMBER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('falls back to memberId as trainerId when the member trainerId is null', async () => {
      const memberObjId = new Types.ObjectId(MEMBER_ID);
      userModel.findById.mockResolvedValue({
        _id: memberObjId,
        trainerId: null,
      });
      checkInModel.findOne = jest.fn().mockResolvedValue(null);
      const saved = { _id: 'new-id' };
      checkInModel.create.mockResolvedValue(saved);

      await service.create(validDto, MEMBER_ID);

      expect(checkInModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trainerId: memberObjId,
        }),
      );
    });
  });

  describe('findByMemberScoped', () => {
    it('returns member check-ins sorted by submittedAt desc when owner requests', async () => {
      const fakeItems = [{ _id: 'a' }, { _id: 'b' }];
      const sortMock = jest.fn().mockResolvedValue(fakeItems);
      checkInModel.find.mockReturnValue({ sort: sortMock });
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(MEMBER_ID),
        role: 'member',
        trainerId: new Types.ObjectId(TRAINER_ID),
      });

      const result = await service.findByMemberScoped(
        MEMBER_ID,
        new Types.ObjectId().toString(),
        'owner',
      );

      expect(checkInModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
      });
      expect(sortMock).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(result).toEqual(fakeItems);
    });

    it('throws NotFoundException when trainer requests a member not assigned to them', async () => {
      const differentTrainerId = new Types.ObjectId().toString();
      userModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(MEMBER_ID),
        role: 'member',
        trainerId: new Types.ObjectId(TRAINER_ID),
      });

      await expect(
        service.findByMemberScoped(MEMBER_ID, differentTrainerId, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByMemberScoped', () => {
    it('returns the check-in when it belongs to the scoped member', async () => {
      const checkInId = new Types.ObjectId().toString();
      const memberObjId = new Types.ObjectId(MEMBER_ID);
      const fakeCheckIn = {
        _id: new Types.ObjectId(checkInId),
        memberId: memberObjId,
      };
      userModel.findById.mockResolvedValue({
        _id: memberObjId,
        role: 'member',
        trainerId: new Types.ObjectId(TRAINER_ID),
      });
      checkInModel.findOne.mockResolvedValue(fakeCheckIn);

      const result = await service.findOneByMemberScoped(
        MEMBER_ID,
        checkInId,
        new Types.ObjectId().toString(),
        'owner',
      );

      expect(checkInModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(checkInId),
      });
      expect(result).toEqual(fakeCheckIn);
    });

    it("throws NotFoundException when the check-in's memberId does not match the path memberId", async () => {
      const checkInId = new Types.ObjectId().toString();
      const otherMemberId = new Types.ObjectId();
      const memberObjId = new Types.ObjectId(MEMBER_ID);
      const fakeCheckIn = {
        _id: new Types.ObjectId(checkInId),
        memberId: otherMemberId,
      };
      userModel.findById.mockResolvedValue({
        _id: memberObjId,
        role: 'member',
        trainerId: new Types.ObjectId(TRAINER_ID),
      });
      checkInModel.findOne.mockResolvedValue(fakeCheckIn);

      await expect(
        service.findOneByMemberScoped(
          MEMBER_ID,
          checkInId,
          new Types.ObjectId().toString(),
          'owner',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPhotosForMemberScoped', () => {
    const checkInId1 = new Types.ObjectId();
    const checkInId2 = new Types.ObjectId();
    const OWNER_ID = new Types.ObjectId().toString();

    const memberDoc = {
      _id: new Types.ObjectId(MEMBER_ID),
      role: 'member' as const,
      trainerId: new Types.ObjectId(TRAINER_ID),
    };

    it('flattens each check-in photos[] into one item per URL with key, photoUrl, submittedAt, and weight', async () => {
      userModel.findById.mockResolvedValue(memberDoc);
      const date1 = new Date('2024-03-01T10:00:00Z');
      const date2 = new Date('2024-03-08T10:00:00Z');
      checkInModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: checkInId2,
            photos: ['http://example.com/b.jpg'],
            submittedAt: date2,
            weight: 75.5,
          },
          {
            _id: checkInId1,
            photos: ['http://example.com/a1.jpg', 'http://example.com/a2.jpg'],
            submittedAt: date1,
            weight: null,
          },
        ]),
      });

      const result = await service.findPhotosForMemberScoped(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        key: `${checkInId2.toString()}-0`,
        photoUrl: 'http://example.com/b.jpg',
        submittedAt: date2.toISOString(),
        weight: 75.5,
      });
      expect(result[1]).toEqual({
        key: `${checkInId1.toString()}-0`,
        photoUrl: 'http://example.com/a1.jpg',
        submittedAt: date1.toISOString(),
        weight: null,
      });
      expect(result[2]).toEqual({
        key: `${checkInId1.toString()}-1`,
        photoUrl: 'http://example.com/a2.jpg',
        submittedAt: date1.toISOString(),
        weight: null,
      });
    });

    it('returns items ordered newest-first by submittedAt', async () => {
      userModel.findById.mockResolvedValue(memberDoc);
      const older = new Date('2024-01-01T00:00:00Z');
      const newer = new Date('2024-02-01T00:00:00Z');
      checkInModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: checkInId2,
            photos: ['http://example.com/newer.jpg'],
            submittedAt: newer,
            weight: null,
          },
          {
            _id: checkInId1,
            photos: ['http://example.com/older.jpg'],
            submittedAt: older,
            weight: null,
          },
        ]),
      });

      const result = await service.findPhotosForMemberScoped(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result[0].photoUrl).toBe('http://example.com/newer.jpg');
      expect(result[1].photoUrl).toBe('http://example.com/older.jpg');
    });

    it('excludes check-ins with an empty photos array', async () => {
      userModel.findById.mockResolvedValue(memberDoc);
      const date = new Date('2024-03-01T10:00:00Z');
      checkInModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: checkInId1,
            photos: [],
            submittedAt: date,
            weight: 70,
          },
          {
            _id: checkInId2,
            photos: ['http://example.com/photo.jpg'],
            submittedAt: date,
            weight: null,
          },
        ]),
      });

      const result = await service.findPhotosForMemberScoped(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result).toHaveLength(1);
      expect(result[0].photoUrl).toBe('http://example.com/photo.jpg');
    });

    it('throws NotFoundException when a trainer requests a member not assigned to them', async () => {
      const differentTrainerId = new Types.ObjectId().toString();
      userModel.findById.mockResolvedValue(memberDoc);

      await expect(
        service.findPhotosForMemberScoped(
          MEMBER_ID,
          differentTrainerId,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns [] when the member has check-ins but none contain photos', async () => {
      userModel.findById.mockResolvedValue(memberDoc);
      checkInModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: checkInId1, photos: [], submittedAt: new Date(), weight: null },
        ]),
      });

      const result = await service.findPhotosForMemberScoped(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getUploadSignature', () => {
    it('returns config with folder "check-ins"', () => {
      const result = service.getUploadSignature();
      expect(result.folder).toBe('check-ins');
    });

    it('returns local provider when UPLOAD_PROVIDER is local', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'UPLOAD_PROVIDER') return 'local';
        return undefined;
      });

      const result = service.getUploadSignature();
      expect(result.provider).toBe('local');
      expect(result.folder).toBe('check-ins');
    });
  });
});
