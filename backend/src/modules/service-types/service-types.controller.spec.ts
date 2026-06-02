import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ServiceTypesController } from './service-types.controller';
import { ServiceTypesService } from './service-types.service';

const mockId = new Types.ObjectId().toString();
const mockUserId = new Types.ObjectId().toString();

const mockServiceType = {
  _id: new Types.ObjectId(mockId),
  name: 'PT Session',
  durationMin: 60,
  pricePerSession: 80,
  currency: 'AUD',
  note: null,
  isActive: true,
  createdBy: new Types.ObjectId(mockUserId),
  createdAt: new Date('2025-01-01'),
};

const mockService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

describe('ServiceTypesController', () => {
  let controller: ServiceTypesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceTypesController],
      providers: [{ provide: ServiceTypesService, useValue: mockService }],
    }).compile();

    controller = module.get<ServiceTypesController>(ServiceTypesController);
  });

  describe('create', () => {
    it('passes req.user.sub as the userId argument to service.create', async () => {
      mockService.create.mockResolvedValue(mockServiceType);

      const req = { user: { sub: mockUserId } };
      const dto = { name: 'PT Session', durationMin: 60, pricePerSession: 80 };

      await controller.create(
        req as Parameters<typeof controller.create>[0],
        dto,
      );

      expect(mockService.create).toHaveBeenCalledWith(dto, mockUserId);
    });
  });
});
