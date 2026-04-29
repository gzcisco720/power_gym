import { EquipmentModel } from '@/lib/db/models/equipment.model';
import type { IEquipment, EquipmentCategory, EquipmentStatus } from '@/lib/db/models/equipment.model';

export interface CreateEquipmentData {
  name: string;
  category: EquipmentCategory;
  quantity: number;
  status: EquipmentStatus;
  purchasedAt: Date | null;
  notes: string | null;
}

export type UpdateEquipmentData = Partial<CreateEquipmentData>;

export interface IEquipmentRepository {
  findAll(): Promise<IEquipment[]>;
  findById(id: string): Promise<IEquipment | null>;
  create(data: CreateEquipmentData): Promise<IEquipment>;
  update(id: string, data: UpdateEquipmentData): Promise<IEquipment | null>;
  deleteById(id: string): Promise<void>;
}

export class MongoEquipmentRepository implements IEquipmentRepository {
  async findAll(): Promise<IEquipment[]> {
    return EquipmentModel.find({}).sort({ name: 1 });
  }

  async findById(id: string): Promise<IEquipment | null> {
    return EquipmentModel.findById(id);
  }

  async create(data: CreateEquipmentData): Promise<IEquipment> {
    const doc = new EquipmentModel(data);
    return doc.save();
  }

  async update(id: string, data: UpdateEquipmentData): Promise<IEquipment | null> {
    return EquipmentModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string): Promise<void> {
    await EquipmentModel.findByIdAndDelete(id);
  }
}
