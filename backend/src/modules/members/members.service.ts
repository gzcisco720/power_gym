import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
import {
  MemberInjury,
  MemberInjuryDocument,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationDocument,
} from '../../common/models/member-medication.model';
import { UserRole } from '../../common/models/user.model';

export interface MemberListItem {
  id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
}

export interface MemberOverview {
  joinedAt: Date;
  lastBodyTestDate: Date | null;
  lastCheckinDate: Date | null;
}

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(MemberInjury.name)
    private readonly injuryModel: Model<MemberInjuryDocument>,
    @InjectModel(MemberMedication.name)
    private readonly medicationModel: Model<MemberMedicationDocument>,
  ) {}

  async listMembers(
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<MemberListItem[]> {
    const query: { role: UserRole; trainerId?: Types.ObjectId } = {
      role: 'member',
    };
    if (requesterRole === 'trainer') {
      query.trainerId = new Types.ObjectId(requesterId);
    }

    const members = await this.userModel.find(query);

    // Collect unique trainer IDs to resolve names in one pass
    const trainerIdSet = new Set<string>();
    for (const m of members) {
      if (m.trainerId) trainerIdSet.add(m.trainerId.toString());
    }

    const trainerMap = new Map<string, string>();
    for (const tid of trainerIdSet) {
      const trainer = await this.userModel.findById(tid);
      if (trainer) {
        trainerMap.set(tid, `${trainer.firstName} ${trainer.lastName}`);
      }
    }

    return members.map((m) => {
      const trainerIdStr = m.trainerId ? m.trainerId.toString() : null;
      return {
        id: m._id.toString(),
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        trainerId: trainerIdStr,
        trainerName: trainerIdStr
          ? (trainerMap.get(trainerIdStr) ?? null)
          : null,
      };
    });
  }

  async getOverview(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<MemberOverview> {
    const member = await this.resolveAndScopeMember(
      memberId,
      requesterId,
      requesterRole,
    );

    const memberObjId = new Types.ObjectId(memberId);

    const [latestBodyTest, latestCheckin] = await Promise.all([
      this.bodyTestModel.findOne({ memberId: memberObjId }).sort({ date: -1 }),
      this.checkInModel
        .findOne({ memberId: memberObjId })
        .sort({ submittedAt: -1 }),
    ]);

    return {
      joinedAt: (member as UserDocument & { createdAt: Date }).createdAt,
      lastBodyTestDate: latestBodyTest ? latestBodyTest.date : null,
      lastCheckinDate: latestCheckin ? latestCheckin.submittedAt : null,
    };
  }

  async getBodyTests(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<BodyTestDocument[]> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    return this.bodyTestModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ date: -1 });
  }

  async getInjuries(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<MemberInjuryDocument[]> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    return this.injuryModel
      .find({ memberId: new Types.ObjectId(memberId), status: 'active' })
      .sort({ recordedAt: -1 });
  }

  async getMedications(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<MemberMedicationDocument[]> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    return this.medicationModel
      .find({ memberId: new Types.ObjectId(memberId), status: 'active' })
      .sort({ startDate: -1 });
  }

  /**
   * Resolves the member by id, verifies they have the 'member' role,
   * and for trainer requests verifies the member belongs to that trainer.
   * Throws NotFoundException for all failure cases (do not leak existence).
   */
  private async resolveAndScopeMember(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<UserDocument> {
    const member = await this.userModel.findById(memberId);

    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (requesterRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== requesterId) {
        throw new NotFoundException('Member not found');
      }
    }

    return member;
  }
}
