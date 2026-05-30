import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EquipmentRepository,
  CreateEquipmentData,
  UpdateEquipmentData,
} from '../repositories/equipment.repository';
import { ConditionReportRepository } from '../repositories/condition-report.repository';
import type {
  IEquipment,
  EquipmentStatus,
} from '../database/models/equipment.model';
import type { IConditionReport } from '../database/models/condition-report.model';

const VALID_STATUSES: EquipmentStatus[] = ['active', 'maintenance', 'retired'];

@Injectable()
export class EquipmentService {
  constructor(
    private readonly eqRepo: EquipmentRepository,
    private readonly crRepo: ConditionReportRepository,
  ) {}

  async findAll(): Promise<IEquipment[]> {
    return this.eqRepo.findAll();
  }

  async create(data: CreateEquipmentData): Promise<IEquipment> {
    return this.eqRepo.create({
      name: data.name,
      status: data.status ?? 'active',
      brand: data.brand ?? null,
      quantity: data.quantity ?? 1,
      images: data.images ?? [],
      note: data.note ?? null,
      trackCondition: data.trackCondition ?? false,
      nextServiceDate: data.nextServiceDate ?? null,
    });
  }

  async findOne(id: string): Promise<IEquipment> {
    const item = await this.eqRepo.findById(id);
    if (!item) throw new NotFoundException('Equipment not found');
    return item;
  }

  async update(id: string, data: UpdateEquipmentData): Promise<IEquipment> {
    const item = await this.eqRepo.findById(id);
    if (!item) throw new NotFoundException('Equipment not found');
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Invalid status: must be one of ${VALID_STATUSES.join(', ')}`,
      );
    }
    const updated = await this.eqRepo.update(id, data);
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.eqRepo.deleteById(id);
  }

  async getConditionReports(id: string): Promise<IConditionReport[]> {
    const item = await this.eqRepo.findById(id);
    if (!item) throw new NotFoundException('Equipment not found');
    return this.crRepo.findByEquipmentId(id);
  }

  async addConditionReport(
    id: string,
    note: string,
  ): Promise<IConditionReport> {
    const item = await this.eqRepo.findById(id);
    if (!item) throw new NotFoundException('Equipment not found');
    return this.crRepo.create({ equipmentId: id, note });
  }
}
