import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ServiceType,
  ServiceTypeDocument,
} from '../../common/models/service-type.model';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectModel(ServiceType.name)
    private readonly serviceTypeModel: Model<ServiceTypeDocument>,
  ) {}

  async findAll(): Promise<ServiceTypeDocument[]> {
    return this.serviceTypeModel.find({}).sort({ name: 1 });
  }

  async create(
    dto: CreateServiceTypeDto,
    userId: string,
  ): Promise<ServiceTypeDocument> {
    return this.serviceTypeModel.create({
      name: dto.name.trim(),
      durationMin: dto.durationMin,
      pricePerSession: dto.pricePerSession,
      currency: 'AUD',
      note: dto.note?.trim() ?? null,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(
    id: string,
    dto: UpdateServiceTypeDto,
  ): Promise<ServiceTypeDocument> {
    const updated = await this.serviceTypeModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Service type not found');
    return updated;
  }
}
