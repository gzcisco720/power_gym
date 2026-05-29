import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IServiceType,
  SERVICE_TYPE_MODEL,
} from '../database/models/service-type.model';

export interface CreateServiceTypeData {
  name: string;
  durationMin: number;
  pricePerSession: number;
  note: string | null;
  createdBy: string;
}

@Injectable()
export class ServiceTypeRepository {
  constructor(
    @InjectModel(SERVICE_TYPE_MODEL)
    private readonly model: Model<IServiceType>,
  ) {}

  async findAll(): Promise<IServiceType[]> {
    return this.model.find({}).sort({ name: 1 });
  }

  async findActive(): Promise<IServiceType[]> {
    return this.model.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<IServiceType | null> {
    return this.model.findById(id);
  }

  async create(data: CreateServiceTypeData): Promise<IServiceType> {
    const doc = new this.model({
      name: data.name,
      durationMin: data.durationMin,
      pricePerSession: data.pricePerSession,
      currency: 'AUD',
      note: data.note,
      createdBy: new Types.ObjectId(data.createdBy),
    });
    return doc.save();
  }

  async findByIds(ids: string[]): Promise<IServiceType[]> {
    return this.model.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    });
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }
}
