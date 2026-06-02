import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ServiceTypesService } from './service-types.service';
import { ServiceType } from '../../common/models/service-type.model';

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

const makeModel = () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
});

describe('ServiceTypesService', () => {
  let service: ServiceTypesService;
  let model: ReturnType<typeof makeModel>;

  beforeEach(async () => {
    model = makeModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceTypesService,
        { provide: getModelToken(ServiceType.name), useValue: model },
      ],
    }).compile();

    service = module.get<ServiceTypesService>(ServiceTypesService);
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('calls find({}) then sort({ name: 1 }) and returns the result', async () => {
      const sorted = [mockServiceType];
      const sortMock = jest.fn().mockResolvedValue(sorted);
      model.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll();

      expect(model.find).toHaveBeenCalledWith({});
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual(sorted);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persists with currency:"AUD", createdBy set from userId, and trimmed name when name has surrounding whitespace', async () => {
      model.create.mockResolvedValue(mockServiceType);

      const result = await service.create(
        { name: '  PT Session  ', durationMin: 60, pricePerSession: 80 },
        mockUserId,
      );

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PT Session',
          durationMin: 60,
          pricePerSession: 80,
          currency: 'AUD',
          createdBy: new Types.ObjectId(mockUserId),
        }),
      );
      expect(result).toEqual(mockServiceType);
    });

    it('applies isActive default true (does not set isActive in the create payload)', async () => {
      model.create.mockResolvedValue(mockServiceType);

      await service.create(
        { name: 'PT Session', durationMin: 60, pricePerSession: 80 },
        mockUserId,
      );

      const calls = model.create.mock.calls as [Record<string, unknown>][][];
      const callArg = calls[0][0];
      expect(callArg).not.toHaveProperty('isActive');
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('calls findByIdAndUpdate(id, { $set: dto }, { new: true }) and returns updated document', async () => {
      const updated = { ...mockServiceType, isActive: false };
      model.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update(mockId, { isActive: false });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId,
        { $set: { isActive: false } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when findByIdAndUpdate resolves null', async () => {
      model.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.update(mockId, { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
