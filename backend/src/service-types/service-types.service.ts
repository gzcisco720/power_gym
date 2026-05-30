import { Injectable } from '@nestjs/common';
import { ServiceTypeRepository } from '../repositories/service-type.repository';
import type { IServiceType } from '../database/models/service-type.model';

export interface CreateServiceTypeData {
  name: string;
  durationMin: number;
  pricePerSession: number;
  note: string | null;
  createdBy: string;
}

export interface UpdateServiceTypeData {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  note?: string | null;
  isActive?: boolean;
}

@Injectable()
export class ServiceTypesService {
  constructor(private readonly repo: ServiceTypeRepository) {}

  async list(): Promise<IServiceType[]> {
    return this.repo.findAll();
  }

  async listActive(): Promise<IServiceType[]> {
    return this.repo.findActive();
  }

  async create(data: CreateServiceTypeData): Promise<IServiceType> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: UpdateServiceTypeData,
  ): Promise<IServiceType | null> {
    return this.repo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
