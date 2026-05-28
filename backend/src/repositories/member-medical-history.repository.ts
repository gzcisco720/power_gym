import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IMemberMedicalHistory,
  MEMBER_MEDICAL_HISTORY_MODEL,
  PregnancyStatus,
} from '../database/models/member-medical-history.model';

export interface UpsertMedicalHistoryData {
  chronicConditions?: string[];
  surgeries?: string | null;
  allergies?: string | null;
  familyHistory?: string | null;
  currentDoctor?: string | null;
  emergencyContact?: string | null;
  pregnancyStatus?: PregnancyStatus | null;
}

@Injectable()
export class MemberMedicalHistoryRepository {
  constructor(
    @InjectModel(MEMBER_MEDICAL_HISTORY_MODEL)
    private readonly model: Model<IMemberMedicalHistory>,
  ) {}

  async findByMember(memberId: string): Promise<IMemberMedicalHistory | null> {
    return this.model.findOne({
      memberId: new Types.ObjectId(memberId),
    });
  }

  async upsert(
    memberId: string,
    data: UpsertMedicalHistoryData,
  ): Promise<IMemberMedicalHistory> {
    const result = await this.model.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId) },
      { $set: data },
      { new: true, upsert: true },
    );
    return result;
  }
}
