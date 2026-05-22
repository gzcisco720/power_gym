import { ServiceTypeModel, type IServiceType } from '@/lib/db/models/service-type.model';

export interface CreateServiceTypeData {
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  createdBy: string;
}

export interface UpdateServiceTypeData {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  currency?: string;
  isActive?: boolean;
}

export interface IServiceTypeRepository {
  findAll(): Promise<IServiceType[]>;
  findActive(): Promise<IServiceType[]>;
  findById(id: string): Promise<IServiceType | null>;
  create(data: CreateServiceTypeData): Promise<IServiceType>;
  update(id: string, data: UpdateServiceTypeData): Promise<IServiceType | null>;
  deactivate(id: string): Promise<IServiceType | null>;
}

export class MongoServiceTypeRepository implements IServiceTypeRepository {
  async findAll(): Promise<IServiceType[]> {
    return ServiceTypeModel.find({}).sort({ name: 1 });
  }

  async findActive(): Promise<IServiceType[]> {
    return ServiceTypeModel.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<IServiceType | null> {
    return ServiceTypeModel.findById(id);
  }

  async create(data: CreateServiceTypeData): Promise<IServiceType> {
    const doc = new ServiceTypeModel({
      name: data.name,
      durationMin: data.durationMin,
      pricePerSession: data.pricePerSession,
      currency: data.currency,
      createdBy: data.createdBy,
    });
    return doc.save();
  }

  async update(id: string, data: UpdateServiceTypeData): Promise<IServiceType | null> {
    return ServiceTypeModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deactivate(id: string): Promise<IServiceType | null> {
    return ServiceTypeModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
  }
}
