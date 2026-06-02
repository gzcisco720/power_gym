import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';

const mockEquipmentId = new Types.ObjectId().toString();

const mockEquipment = {
  _id: new Types.ObjectId(mockEquipmentId),
  name: 'Treadmill',
  status: 'active',
  brand: null,
  quantity: 1,
  images: [],
  note: null,
  trackCondition: false,
  nextServiceDate: null,
  createdAt: new Date('2025-01-01'),
};

const mockService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findConditionReports: jest.fn(),
  createConditionReport: jest.fn(),
  getUploadSignature: jest.fn(),
};

describe('EquipmentController', () => {
  let controller: EquipmentController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [{ provide: EquipmentService, useValue: mockService }],
    }).compile();

    controller = module.get<EquipmentController>(EquipmentController);
  });

  describe('create', () => {
    it('calls service.create with the DTO and returns its result', async () => {
      mockService.create.mockResolvedValue(mockEquipment);
      const dto: CreateEquipmentDto = { name: 'Treadmill' };

      const result = await controller.create(dto);

      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('remove', () => {
    it('calls service.remove with the route id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockEquipmentId);

      expect(mockService.remove).toHaveBeenCalledWith(mockEquipmentId);
    });
  });

  describe('getUploadSignature', () => {
    it('calls service.getUploadSignature and returns its result', () => {
      const mockConfig = {
        provider: 'cloudinary',
        uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
        apiKey: 'key',
        signature: 'sig',
        timestamp: 1700000000,
        folder: 'equipment',
        cloudName: 'test',
      };
      mockService.getUploadSignature.mockReturnValue(mockConfig);

      const result = controller.getUploadSignature();

      expect(mockService.getUploadSignature).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });
  });
});
