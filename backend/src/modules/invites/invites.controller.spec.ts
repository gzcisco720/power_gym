import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

const mockOwnerId = new Types.ObjectId().toString();
const mockInviteId = new Types.ObjectId().toString();

const mockService = {
  findMine: jest.fn(),
  listTrainers: jest.fn(),
  create: jest.fn(),
  revoke: jest.fn(),
};

describe('InvitesController', () => {
  let controller: InvitesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [{ provide: InvitesService, useValue: mockService }],
    }).compile();

    controller = module.get<InvitesController>(InvitesController);
  });

  describe('create', () => {
    it('passes req.user.role and req.user.sub to service.create alongside the dto', async () => {
      mockService.create.mockResolvedValue({});

      const req = { user: { sub: mockOwnerId, role: 'owner' } };
      const dto = { role: 'trainer' as const, recipientEmail: 't@x.com' };

      await controller.create(
        req as Parameters<typeof controller.create>[0],
        dto,
      );

      expect(mockService.create).toHaveBeenCalledWith(
        dto,
        'owner',
        mockOwnerId,
      );
    });
  });

  describe('findMine', () => {
    it('passes req.user.sub to service.findMine', async () => {
      mockService.findMine.mockResolvedValue([]);

      const req = { user: { sub: mockOwnerId, role: 'owner' } };

      await controller.findMine(
        req as Parameters<typeof controller.findMine>[0],
      );

      expect(mockService.findMine).toHaveBeenCalledWith(mockOwnerId);
    });
  });

  describe('listTrainers', () => {
    it('delegates to service.listTrainers', async () => {
      const trainers = [{ _id: new Types.ObjectId(), name: 'John Doe' }];
      mockService.listTrainers.mockResolvedValue(trainers);

      const result = await controller.listTrainers();

      expect(mockService.listTrainers).toHaveBeenCalled();
      expect(result).toEqual(trainers);
    });
  });

  describe('revoke', () => {
    it('passes id and req.user.sub to service.revoke', async () => {
      mockService.revoke.mockResolvedValue(undefined);

      const req = { user: { sub: mockOwnerId, role: 'owner' } };

      await controller.revoke(
        mockInviteId,
        req as Parameters<typeof controller.revoke>[1],
      );

      expect(mockService.revoke).toHaveBeenCalledWith(
        mockInviteId,
        mockOwnerId,
      );
    });
  });
});
