import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import type {
  IPlanTemplate,
  IPlanDay,
} from '../database/models/plan-template.model';

export interface CreatePlanTemplateDto {
  name: string;
  description?: string | null;
  days?: IPlanDay[];
}

export interface UpdatePlanTemplateDto {
  name?: string;
  description?: string | null;
  days?: IPlanDay[];
}

@Injectable()
export class PlanTemplatesService {
  constructor(private readonly repo: PlanTemplateRepository) {}

  async findAll(userId: string): Promise<IPlanTemplate[]> {
    return this.repo.findByCreator(userId);
  }

  async create(
    dto: CreatePlanTemplateDto,
    userId: string,
  ): Promise<IPlanTemplate> {
    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      createdBy: userId,
      days: dto.days ?? [],
    });
  }

  async findOne(id: string, userId: string): Promise<IPlanTemplate> {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdBy.toString() !== userId)
      throw new ForbiddenException();
    return template;
  }

  async update(
    id: string,
    dto: UpdatePlanTemplateDto,
    userId: string,
  ): Promise<IPlanTemplate> {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdBy.toString() !== userId)
      throw new ForbiddenException();
    const updated = await this.repo.update(id, dto);
    return updated!;
  }

  async remove(id: string, userId: string): Promise<void> {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdBy.toString() !== userId)
      throw new ForbiddenException();
    await this.repo.deleteById(id, userId);
  }
}
