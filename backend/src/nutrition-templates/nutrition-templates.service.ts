import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import type {
  INutritionTemplate,
  IDayType,
} from '../database/models/nutrition-template.model';

export interface CreateNutritionTemplateDto {
  name: string;
  description?: string | null;
  dayTypes?: IDayType[];
}

export interface UpdateNutritionTemplateDto {
  name?: string;
  description?: string | null;
  dayTypes?: IDayType[];
}

@Injectable()
export class NutritionTemplatesService {
  constructor(private readonly repo: NutritionTemplateRepository) {}

  async findAll(userId: string): Promise<INutritionTemplate[]> {
    return this.repo.findByCreator(userId);
  }

  async create(
    dto: CreateNutritionTemplateDto,
    userId: string,
  ): Promise<INutritionTemplate> {
    return this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      createdBy: userId,
      dayTypes: dto.dayTypes ?? [],
    });
  }

  async findOne(id: string, userId: string): Promise<INutritionTemplate> {
    const template = await this.repo.findById(id);
    if (!template) throw new NotFoundException('Template not found');
    if (template.createdBy.toString() !== userId)
      throw new ForbiddenException();
    return template;
  }

  async update(
    id: string,
    dto: UpdateNutritionTemplateDto,
    userId: string,
  ): Promise<INutritionTemplate> {
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
