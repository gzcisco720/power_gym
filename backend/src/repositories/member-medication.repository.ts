import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IMemberMedication,
  MEMBER_MEDICATION_MODEL,
  MedicationDuration,
  MedicationStatus,
} from '../database/models/member-medication.model';

export interface CreateMedicationData {
  memberId: string;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
}

export type UpdateMedicationData = Partial<
  Omit<CreateMedicationData, 'memberId'> & { status: MedicationStatus }
>;

@Injectable()
export class MemberMedicationRepository {
  constructor(
    @InjectModel(MEMBER_MEDICATION_MODEL)
    private readonly model: Model<IMemberMedication>,
  ) {}

  async findByMember(memberId: string): Promise<IMemberMedication[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ status: 1, startDate: -1 });
  }

  async findById(id: string): Promise<IMemberMedication | null> {
    return this.model.findById(id);
  }

  async create(data: CreateMedicationData): Promise<IMemberMedication> {
    const doc = new this.model({
      ...data,
      memberId: new Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(
    id: string,
    data: UpdateMedicationData,
  ): Promise<IMemberMedication | null> {
    return this.model.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: data },
      { new: true },
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(new Types.ObjectId(id));
  }
}
