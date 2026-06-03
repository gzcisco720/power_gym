import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InvitesService } from './invites.service';
import { InviteToken } from '../../common/models/invite-token.model';
import { User } from '../../common/models/user.model';

const mockOwnerId = new Types.ObjectId().toString();
const mockTrainerId = new Types.ObjectId().toString();
const mockInviteId = new Types.ObjectId().toString();

const makeInviteModel = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
});

const makeUserModel = () => ({
  find: jest.fn(),
});

describe('InvitesService', () => {
  let service: InvitesService;
  let inviteModel: ReturnType<typeof makeInviteModel>;
  let userModel: ReturnType<typeof makeUserModel>;

  beforeEach(async () => {
    inviteModel = makeInviteModel();
    userModel = makeUserModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: getModelToken(InviteToken.name), useValue: inviteModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('owner with role:"member" and no trainerId throws BadRequestException', async () => {
      await expect(
        service.create(
          { role: 'member', recipientEmail: 'm@x.com' },
          'owner',
          mockOwnerId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('owner with role:"member" and a trainerId calls model.create with token (uuid), expiresAt ~48h ahead, usedAt:null, invitedBy from userId, and the given trainerId', async () => {
      const mockInvite = {
        _id: new Types.ObjectId(mockInviteId),
        token: 'some-uuid',
        role: 'member',
        recipientEmail: 'm@x.com',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        usedAt: null,
        trainerId: new Types.ObjectId(mockTrainerId),
        invitedBy: new Types.ObjectId(mockOwnerId),
      };
      inviteModel.create.mockResolvedValue(mockInvite);

      const before = Date.now();
      await service.create(
        { role: 'member', recipientEmail: 'm@x.com', trainerId: mockTrainerId },
        'owner',
        mockOwnerId,
      );
      const after = Date.now();

      const callArg = (
        inviteModel.create.mock.calls as [Record<string, unknown>][][]
      )[0][0];

      // token should be a UUID-like string (non-empty)
      expect(typeof callArg.token).toBe('string');
      expect((callArg.token as string).length).toBeGreaterThan(0);

      // expiresAt should be ~48h ahead
      const expiresAt = (callArg.expiresAt as Date).getTime();
      const expected48h = 48 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThanOrEqual(before + expected48h - 1000);
      expect(expiresAt).toBeLessThanOrEqual(after + expected48h + 1000);

      // usedAt null
      expect(callArg.usedAt).toBeNull();

      // invitedBy from userId
      expect(callArg.invitedBy).toEqual(new Types.ObjectId(mockOwnerId));

      // trainerId from body
      expect(callArg.trainerId).toEqual(new Types.ObjectId(mockTrainerId));
    });

    it('owner with role:"trainer" calls model.create with role:"trainer" and trainerId:null', async () => {
      inviteModel.create.mockResolvedValue({});

      await service.create(
        { role: 'trainer', recipientEmail: 't@x.com' },
        'owner',
        mockOwnerId,
      );

      const callArg = (
        inviteModel.create.mock.calls as [Record<string, unknown>][][]
      )[0][0];
      expect(callArg.role).toBe('trainer');
      expect(callArg.trainerId).toBeNull();
    });

    it('trainer with role:"trainer" throws ForbiddenException', async () => {
      await expect(
        service.create(
          { role: 'trainer', recipientEmail: 't@x.com' },
          'trainer',
          mockTrainerId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('trainer with role:"member" forces trainerId to the trainer\'s own userId (ignoring any body trainerId)', async () => {
      inviteModel.create.mockResolvedValue({});
      const bodyTrainerId = new Types.ObjectId().toString();

      await service.create(
        { role: 'member', recipientEmail: 'm@x.com', trainerId: bodyTrainerId },
        'trainer',
        mockTrainerId,
      );

      const callArg = (
        inviteModel.create.mock.calls as [Record<string, unknown>][][]
      )[0][0];
      expect(callArg.trainerId).toEqual(new Types.ObjectId(mockTrainerId));
    });
  });

  // ─── findMine ─────────────────────────────────────────────────────────────────

  describe('findMine', () => {
    it('calls find({ invitedBy: userId }) then sort({ expiresAt: -1 }) and returns the result', async () => {
      const mockInvites = [{ _id: new Types.ObjectId(), token: 'abc' }];
      const sortMock = jest.fn().mockResolvedValue(mockInvites);
      inviteModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findMine(mockOwnerId);

      expect(inviteModel.find).toHaveBeenCalledWith({
        invitedBy: new Types.ObjectId(mockOwnerId),
      });
      expect(sortMock).toHaveBeenCalledWith({ expiresAt: -1 });
      expect(result).toEqual(mockInvites);
    });
  });

  // ─── listTrainers ─────────────────────────────────────────────────────────────

  describe('listTrainers', () => {
    it('calls find({ role:"trainer" }) and returns mapped {_id, name} entries', async () => {
      const mockTrainers = [
        {
          _id: new Types.ObjectId(mockTrainerId),
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe',
        },
      ];
      const selectMock = jest.fn().mockResolvedValue(mockTrainers);
      userModel.find.mockReturnValue({ select: selectMock });

      const result = await service.listTrainers();

      expect(userModel.find).toHaveBeenCalledWith({ role: 'trainer' });
      expect(result).toEqual([{ _id: mockTrainers[0]._id, name: 'John Doe' }]);
    });
  });

  // ─── revoke ───────────────────────────────────────────────────────────────────

  describe('revoke', () => {
    it('throws NotFoundException when no invite matches { _id, invitedBy }', async () => {
      inviteModel.findOne.mockResolvedValue(null);

      await expect(service.revoke(mockInviteId, mockOwnerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the matched invite has a non-null usedAt', async () => {
      inviteModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(mockInviteId),
        usedAt: new Date(),
      });

      await expect(service.revoke(mockInviteId, mockOwnerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deletes and resolves when the invite belongs to the user and usedAt is null', async () => {
      inviteModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(mockInviteId),
        usedAt: null,
      });
      inviteModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await expect(
        service.revoke(mockInviteId, mockOwnerId),
      ).resolves.toBeUndefined();
      expect(inviteModel.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockInviteId),
      });
    });
  });
});
