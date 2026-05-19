import mongoose from 'mongoose';
import { MemberMedicalHistoryModel } from '@/lib/db/models/member-medical-history.model';
import type { IMemberMedicalHistory, PregnancyStatus } from '@/lib/db/models/member-medical-history.model';

export interface UpsertMedicalHistoryData {
  chronicConditions?: string[];
  surgeries?: string | null;
  allergies?: string | null;
  familyHistory?: string | null;
  currentDoctor?: string | null;
  emergencyContact?: string | null;
  pregnancyStatus?: PregnancyStatus | null;
}

export interface IMemberMedicalHistoryRepository {
  findByMember(memberId: string): Promise<IMemberMedicalHistory | null>;
  upsert(memberId: string, data: UpsertMedicalHistoryData): Promise<IMemberMedicalHistory>;
}

export class MongoMemberMedicalHistoryRepository implements IMemberMedicalHistoryRepository {
  async findByMember(memberId: string): Promise<IMemberMedicalHistory | null> {
    return MemberMedicalHistoryModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
    });
  }

  async upsert(memberId: string, data: UpsertMedicalHistoryData): Promise<IMemberMedicalHistory> {
    const result = await MemberMedicalHistoryModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: data },
      { new: true, upsert: true },
    );
    return result!;
  }
}
