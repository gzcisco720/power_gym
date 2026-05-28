import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IEquipment,
  EQUIPMENT_MODEL,
  EquipmentStatus,
} from '../database/models/equipment.model';

export interface CreateEquipmentData {
  name: string;
  status?: EquipmentStatus;
  brand?: string | null;
  quantity?: number;
  images?: string[];
  note?: string | null;
  trackCondition?: boolean;
  nextServiceDate?: Date | null;
}

export type UpdateEquipmentData = Partial<CreateEquipmentData>;

@Injectable()
export class EquipmentRepository {
  constructor(
    @InjectModel(EQUIPMENT_MODEL)
    private readonly model: Model<IEquipment>,
  ) {}

  async findAll(): Promise<IEquipment[]> {
    return this.model.find({}).sort({ name: 1 });
  }

  async findById(id: string): Promise<IEquipment | null> {
    return this.model.findById(id);
  }

  async create(data: CreateEquipmentData): Promise<IEquipment> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(
    id: string,
    data: UpdateEquipmentData,
  ): Promise<IEquipment | null> {
    return this.model.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: data },
      { returnDocument: 'after' },
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(new Types.ObjectId(id));
  }
}
