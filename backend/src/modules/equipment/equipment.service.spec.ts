import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EquipmentService } from './equipment.service';
import { Equipment } from '../../common/models/equipment.model';
import { ConditionReport } from '../../common/models/condition-report.model';

const mockEquipmentId = new Types.ObjectId().toString();
const mockReportId = new Types.ObjectId().toString();

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

const mockReport = {
  _id: new Types.ObjectId(mockReportId),
  equipmentId: new Types.ObjectId(mockEquipmentId),
  note: 'Belt worn',
  reportedAt: new Date('2025-02-01'),
};

const makeEquipmentModel = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
});

const makeConditionReportModel = () => ({
  find: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
});

describe('EquipmentService', () => {
  let service: EquipmentService;
  let equipmentModel: ReturnType<typeof makeEquipmentModel>;
  let conditionReportModel: ReturnType<typeof makeConditionReportModel>;

  beforeEach(async () => {
    equipmentModel = makeEquipmentModel();
    conditionReportModel = makeConditionReportModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getModelToken(Equipment.name), useValue: equipmentModel },
        {
          provide: getModelToken(ConditionReport.name),
          useValue: conditionReportModel,
        },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all equipment sorted by createdAt descending', async () => {
      const sorted = [mockEquipment];
      const sortMock = jest.fn().mockResolvedValue(sorted);
      equipmentModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll();

      expect(equipmentModel.find).toHaveBeenCalledWith({});
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(sorted);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persists item with defaults (status active, quantity 1, trackCondition false) when only name provided', async () => {
      equipmentModel.create.mockResolvedValue(mockEquipment);

      const result = await service.create({ name: 'Treadmill' });

      expect(equipmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Treadmill',
          status: 'active',
          quantity: 1,
          trackCondition: false,
        }),
      );
      expect(result).toEqual(mockEquipment);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns updated document', async () => {
      const updated = { ...mockEquipment, status: 'maintenance' };
      equipmentModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.update(mockEquipmentId, {
        status: 'maintenance',
      });

      expect(equipmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockEquipmentId,
        { $set: { status: 'maintenance' } },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when id does not exist', async () => {
      equipmentModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update(mockEquipmentId, { status: 'maintenance' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the equipment and cascades delete of its condition reports', async () => {
      equipmentModel.findByIdAndDelete.mockResolvedValue(mockEquipment);
      conditionReportModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

      await service.remove(mockEquipmentId);

      expect(equipmentModel.findByIdAndDelete).toHaveBeenCalledWith(
        mockEquipmentId,
      );
      expect(conditionReportModel.deleteMany).toHaveBeenCalledWith({
        equipmentId: new Types.ObjectId(mockEquipmentId),
      });
    });
  });

  // ─── findConditionReports ────────────────────────────────────────────────────

  describe('findConditionReports', () => {
    it('returns reports sorted by reportedAt descending', async () => {
      equipmentModel.findById.mockResolvedValue(mockEquipment);
      const sortMock = jest.fn().mockResolvedValue([mockReport]);
      conditionReportModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findConditionReports(mockEquipmentId);

      expect(conditionReportModel.find).toHaveBeenCalledWith({
        equipmentId: new Types.ObjectId(mockEquipmentId),
      });
      expect(sortMock).toHaveBeenCalledWith({ reportedAt: -1 });
      expect(result).toEqual([mockReport]);
    });

    it('throws NotFoundException when equipment is missing', async () => {
      equipmentModel.findById.mockResolvedValue(null);

      await expect(
        service.findConditionReports(mockEquipmentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createConditionReport ───────────────────────────────────────────────────

  describe('createConditionReport', () => {
    it('persists report with trimmed note', async () => {
      equipmentModel.findById.mockResolvedValue(mockEquipment);
      conditionReportModel.create.mockResolvedValue(mockReport);

      const result = await service.createConditionReport(
        mockEquipmentId,
        '  Belt worn  ',
      );

      expect(conditionReportModel.create).toHaveBeenCalledWith({
        equipmentId: new Types.ObjectId(mockEquipmentId),
        note: 'Belt worn',
      });
      expect(result).toEqual(mockReport);
    });

    it('throws NotFoundException when equipment is missing', async () => {
      equipmentModel.findById.mockResolvedValue(null);

      await expect(
        service.createConditionReport(mockEquipmentId, 'note'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
