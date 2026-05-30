import mongoose from 'mongoose';
import { MemberMedicationModel } from '@/lib/db/models/member-medication.model';
import type { IMemberMedication, MedicationDuration, MedicationStatus } from '@/lib/db/models/member-medication.model';

export interface CreateMedicationData {
  memberId: string;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
}

export type UpdateMedicationData = Partial<Omit<CreateMedicationData, 'memberId'> & { status: MedicationStatus }>;

export interface IMemberMedicationRepository {
  findByMember(memberId: string): Promise<IMemberMedication[]>;
  findById(id: string): Promise<IMemberMedication | null>;
  create(data: CreateMedicationData): Promise<IMemberMedication>;
  update(id: string, data: UpdateMedicationData): Promise<IMemberMedication | null>;
  deleteById(id: string): Promise<void>;
}

export class MongoMemberMedicationRepository implements IMemberMedicationRepository {
  async findByMember(memberId: string): Promise<IMemberMedication[]> {
    return MemberMedicationModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ status: 1, startDate: -1 });
  }

  async findById(id: string): Promise<IMemberMedication | null> {
    return MemberMedicationModel.findById(id);
  }

  async create(data: CreateMedicationData): Promise<IMemberMedication> {
    const doc = new MemberMedicationModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(id: string, data: UpdateMedicationData): Promise<IMemberMedication | null> {
    return MemberMedicationModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string): Promise<void> {
    await MemberMedicationModel.findByIdAndDelete(id);
  }
}
