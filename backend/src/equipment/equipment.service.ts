import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { ConditionReportRepository } from '../repositories/condition-report.repository';
import { IEquipment } from '../database/models/equipment.model';
import { IConditionReport } from '../database/models/condition-report.model';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateConditionReportDto } from './dto/create-condition-report.dto';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly equipmentRepo: EquipmentRepository,
    private readonly conditionReportRepo: ConditionReportRepository,
  ) {}

  async create(dto: CreateEquipmentDto): Promise<IEquipment> {
    if (!dto.name.trim()) {
      throw new BadRequestException('Name is required');
    }
    return this.equipmentRepo.create({
      name: dto.name.trim(),
      status: dto.status ?? 'active',
      brand: dto.brand?.trim() ?? null,
      quantity: dto.quantity ?? 1,
      images: dto.images ?? [],
      note: dto.note?.trim() ?? null,
      trackCondition: dto.trackCondition ?? false,
      nextServiceDate: dto.nextServiceDate
        ? new Date(dto.nextServiceDate)
        : null,
    });
  }

  async findAll(): Promise<IEquipment[]> {
    return this.equipmentRepo.findAll();
  }

  async addConditionReport(
    equipmentId: string,
    dto: CreateConditionReportDto,
  ): Promise<IConditionReport> {
    const equipment = await this.equipmentRepo.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }
    return this.conditionReportRepo.create({ equipmentId, note: dto.note });
  }

  async listConditionReports(equipmentId: string): Promise<IConditionReport[]> {
    return this.conditionReportRepo.findByEquipmentId(equipmentId);
  }

  async deleteEquipment(id: string): Promise<void> {
    await this.equipmentRepo.deleteById(id);
  }
}
