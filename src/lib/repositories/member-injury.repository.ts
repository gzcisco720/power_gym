import mongoose from 'mongoose';
import { MemberInjuryModel } from '@/lib/db/models/member-injury.model';
import type { IMemberInjury, InjuryStatus, InjuryType, BodyPart, BodySide, RehabStatus, CreatedByRole } from '@/lib/db/models/member-injury.model';

export interface CreateInjuryData {
  memberId: string;
  title: string;
  status?: InjuryStatus;
  recordedAt?: Date;
  trainerNotes?: string | null;
  memberNotes?: string | null;
  affectedMovements?: string | null;
  injuryType?: InjuryType | null;
  bodyPart?: BodyPart | null;
  bodySide?: BodySide | null;
  painAtRest?: number | null;
  painDuringExercise?: number | null;
  mechanism?: string | null;
  aggravatingFactors?: string | null;
  relievingFactors?: string | null;
  seenDoctor?: boolean;
  doctorRestrictions?: string | null;
  rehabilitationStatus?: RehabStatus | null;
  resolvedAt?: Date | null;
  createdByRole?: CreatedByRole;
}

export type UpdateInjuryData = Partial<Omit<CreateInjuryData, 'memberId'>>;

export interface IMemberInjuryRepository {
  findByMember(memberId: string): Promise<IMemberInjury[]>;
  findActiveByMember(memberId: string): Promise<IMemberInjury[]>;
  findById(id: string): Promise<IMemberInjury | null>;
  create(data: CreateInjuryData): Promise<IMemberInjury>;
  update(id: string, data: UpdateInjuryData): Promise<IMemberInjury | null>;
  deleteById(id: string): Promise<void>;
}

export class MongoMemberInjuryRepository implements IMemberInjuryRepository {
  async findByMember(memberId: string): Promise<IMemberInjury[]> {
    return MemberInjuryModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ recordedAt: -1 });
  }

  async findActiveByMember(memberId: string): Promise<IMemberInjury[]> {
    return MemberInjuryModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      status: 'active',
    }).sort({ recordedAt: -1 });
  }

  async findById(id: string): Promise<IMemberInjury | null> {
    return MemberInjuryModel.findById(id);
  }

  async create(data: CreateInjuryData): Promise<IMemberInjury> {
    const doc = new MemberInjuryModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(id: string, data: UpdateInjuryData): Promise<IMemberInjury | null> {
    return MemberInjuryModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string): Promise<void> {
    await MemberInjuryModel.findByIdAndDelete(id);
  }
}
