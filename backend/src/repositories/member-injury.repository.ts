import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IMemberInjury,
  MEMBER_INJURY_MODEL,
  InjuryStatus,
  InjuryType,
  BodyPart,
  BodySide,
  RehabStatus,
  CreatedByRole,
} from '../database/models/member-injury.model';

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

@Injectable()
export class MemberInjuryRepository {
  constructor(
    @InjectModel(MEMBER_INJURY_MODEL)
    private readonly model: Model<IMemberInjury>,
  ) {}

  async findByMember(memberId: string): Promise<IMemberInjury[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ recordedAt: -1 });
  }

  async findById(id: string): Promise<IMemberInjury | null> {
    return this.model.findById(id);
  }

  async create(data: CreateInjuryData): Promise<IMemberInjury> {
    const doc = new this.model({
      ...data,
      memberId: new Types.ObjectId(data.memberId),
    });
    return doc.save();
  }

  async update(
    id: string,
    data: UpdateInjuryData,
  ): Promise<IMemberInjury | null> {
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
