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
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  PersonalBest,
  PersonalBestDocument,
} from '../../common/models/personal-best.model';
import {
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';

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

export interface MemberOverviewStats {
  sessionsThisMonth: number;
  weight: { value: number; deltaKg: number | null } | null;
  bodyFat: { pct: number; deltaPct: number | null } | null;
  topPR: { exerciseName: string; estimatedOneRM: number } | null;
  activePlan: { name: string; dayCount: number } | null;
  activeInjuryCount: number;
  activeMedicationCount: number;
  weightTrend: { date: string; weight: number }[];
  heatmap: { date: string; count: number }[];
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
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(PersonalBest.name)
    private readonly personalBestModel: Model<PersonalBestDocument>,
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
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

  async getOverviewStats(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<MemberOverviewStats> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    const memberObjId = new Types.ObjectId(memberId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    const [
      sessionsThisMonth,
      recentBodyTests,
      topPR,
      activePlan,
      activeInjuryCount,
      activeMedicationCount,
      heatmapSessions,
    ] = await Promise.all([
      this.workoutSessionModel.countDocuments({
        memberId: memberObjId,
        completedAt: { $gte: startOfMonth },
      }),
      this.bodyTestModel
        .find({ memberId: memberObjId })
        .sort({ date: -1 })
        .limit(4),
      this.personalBestModel
        .findOne({ memberId: memberObjId })
        .sort({ estimatedOneRM: -1 }),
      this.memberPlanModel.findOne({ memberId: memberObjId, isActive: true }),
      this.injuryModel.countDocuments({
        memberId: memberObjId,
        status: 'active',
      }),
      this.medicationModel.countDocuments({
        memberId: memberObjId,
        status: 'active',
      }),
      this.workoutSessionModel
        .find({
          memberId: memberObjId,
          completedAt: { $gte: ninetyDaysAgo },
        })
        .lean(),
    ]);

    // Weight + body fat from most recent 2 body tests
    const latestTest = recentBodyTests[0] ?? null;
    const prevTest = recentBodyTests[1] ?? null;

    const weight: MemberOverviewStats['weight'] = latestTest
      ? {
          value: latestTest.weight,
          deltaKg: prevTest ? latestTest.weight - prevTest.weight : null,
        }
      : null;

    const bodyFat: MemberOverviewStats['bodyFat'] = latestTest
      ? {
          pct: latestTest.bodyFatPct,
          deltaPct: prevTest
            ? latestTest.bodyFatPct - prevTest.bodyFatPct
            : null,
        }
      : null;

    // Weight trend for chart (oldest → newest)
    const weightTrend = [...recentBodyTests].reverse().map((t) => ({
      date: t.date.toISOString().split('T')[0],
      weight: t.weight,
    }));

    // Heatmap: count sessions per day
    const dayCountMap = new Map<string, number>();
    for (const s of heatmapSessions) {
      if (!s.completedAt) continue;
      const key = s.completedAt.toISOString().split('T')[0];
      dayCountMap.set(key, (dayCountMap.get(key) ?? 0) + 1);
    }
    const heatmap = Array.from(dayCountMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      sessionsThisMonth,
      weight,
      bodyFat,
      topPR: topPR
        ? {
            exerciseName: topPR.exerciseName,
            estimatedOneRM: topPR.estimatedOneRM,
          }
        : null,
      activePlan: activePlan
        ? { name: activePlan.name, dayCount: activePlan.days.length }
        : null,
      activeInjuryCount,
      activeMedicationCount,
      weightTrend,
      heatmap,
    };
  }

  async assignTrainer(
    memberId: string,
    trainerId: string | null,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    trainerId: string | null;
  }> {
    const member = await this.userModel.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(memberId),
      { trainerId: trainerId ? new Types.ObjectId(trainerId) : null },
      { returnDocument: 'after' },
    );

    return {
      id: memberId,
      name: `${updated!.firstName} ${updated!.lastName}`,
      email: updated!.email,
      trainerId: updated!.trainerId ? updated!.trainerId.toString() : null,
    };
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
