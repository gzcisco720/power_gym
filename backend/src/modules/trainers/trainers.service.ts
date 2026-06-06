import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import {
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';
import {
  PlanTemplate,
  PlanTemplateDocument,
} from '../../common/models/plan-template.model';
import {
  NutritionTemplate,
  NutritionTemplateDocument,
} from '../../modules/nutrition-templates/nutrition-template.model';
import {
  TrainerListItem,
  TrainerDetailResponse,
  TrainerMember,
  TrainerMemberMetrics,
  TrainerSessionItem,
  TrainerTemplateItem,
} from './dto/trainer-response.types';

@Injectable()
export class TrainersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(ScheduledSession.name)
    private readonly scheduledSessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(PlanTemplate.name)
    private readonly planTemplateModel: Model<PlanTemplateDocument>,
    @InjectModel(NutritionTemplate.name)
    private readonly nutritionTemplateModel: Model<NutritionTemplateDocument>,
  ) {}

  async findAll(): Promise<TrainerListItem[]> {
    const trainers = await this.userModel.find({ role: 'trainer' });

    const results: TrainerListItem[] = await Promise.all(
      trainers.map(async (trainer) => {
        const members = await this.userModel.find({
          role: 'member',
          trainerId: trainer._id,
        });
        return {
          id: trainer._id.toString(),
          name: `${trainer.firstName} ${trainer.lastName}`,
          email: trainer.email,
          memberCount: members.length,
        };
      }),
    );

    return results;
  }

  async findOne(id: string): Promise<TrainerDetailResponse> {
    const trainer = await this.userModel
      .findById(id)
      .lean<User & { _id: Types.ObjectId; createdAt: Date }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const members = await this.userModel.find({
      role: 'member',
      trainerId: trainer._id,
    });

    const trainerMembers: TrainerMember[] = members.map((m) => ({
      id: m._id.toString(),
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
    }));

    const createdAt = trainer.createdAt;

    return {
      id: trainer._id.toString(),
      name: `${trainer.firstName} ${trainer.lastName}`,
      email: trainer.email,
      memberCount: members.length,
      joinDate: createdAt.toISOString(),
      members: trainerMembers,
    };
  }

  async getTrainerMembers(trainerId: string): Promise<TrainerMemberMetrics[]> {
    const trainer = await this.userModel
      .findById(trainerId)
      .lean<User & { _id: Types.ObjectId }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const members = await this.userModel.find({
      role: 'member',
      trainerId: new Types.ObjectId(trainerId),
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const results: TrainerMemberMetrics[] = await Promise.all(
      members.map(async (member) => {
        const memberObjId = member._id as Types.ObjectId;

        const [activePlan, streak, sessionsThisMonth] = await Promise.all([
          this.memberPlanModel.findOne({
            memberId: memberObjId,
            isActive: true,
          }),
          this.computeStreak(memberObjId, now),
          this.workoutSessionModel.countDocuments({
            memberId: memberObjId,
            completedAt: { $gte: startOfMonth },
          }),
        ]);

        let status: 'active' | 'needs-attn' | 'no-plan';
        if (!activePlan) {
          status = 'no-plan';
        } else if (streak > 0) {
          status = 'active';
        } else {
          status = 'needs-attn';
        }

        return {
          id: memberObjId.toString(),
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          streak,
          sessionsThisMonth,
          status,
        };
      }),
    );

    return results;
  }

  async getTrainerSessions(trainerId: string): Promise<TrainerSessionItem[]> {
    const trainer = await this.userModel
      .findById(trainerId)
      .lean<User & { _id: Types.ObjectId }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const sessions = await this.scheduledSessionModel
      .find({ trainerId: new Types.ObjectId(trainerId) })
      .populate('serviceTypeId')
      .lean<
        (ScheduledSession & {
          _id: Types.ObjectId;
          serviceTypeId: { name: string } | null;
        })[]
      >();

    if (sessions.length === 0) return [];

    // Collect all unique member ids across all sessions
    const allMemberIds = [
      ...new Set(
        sessions.flatMap((s) => s.memberIds.map((id) => id.toString())),
      ),
    ];

    const memberDocs = await this.userModel.find({
      _id: { $in: allMemberIds.map((id) => new Types.ObjectId(id)) },
    });

    const memberNameMap = new Map<string, string>(
      memberDocs.map((m) => [
        m._id.toString(),
        `${m.firstName} ${m.lastName}`,
      ]),
    );

    return sessions.map((s) => ({
      id: s._id.toString(),
      date: new Date(s.date).toISOString().split('T')[0],
      startTime: s.startTime,
      endTime: s.endTime,
      memberNames: s.memberIds.map(
        (id) => memberNameMap.get(id.toString()) ?? 'Unknown',
      ),
      serviceTypeName: s.serviceTypeId?.name ?? s.customServiceName ?? null,
      status: s.status,
    }));
  }

  async getTrainerTrainingPlans(
    trainerId: string,
  ): Promise<TrainerTemplateItem[]> {
    const trainer = await this.userModel
      .findById(trainerId)
      .lean<User & { _id: Types.ObjectId }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const templates = await this.planTemplateModel
      .find({ createdBy: new Types.ObjectId(trainerId) })
      .lean<
        (PlanTemplate & { _id: Types.ObjectId; createdAt: Date })[]
      >();

    return templates.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      dayCount: t.days.length,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getTrainerNutritionPlans(
    trainerId: string,
  ): Promise<TrainerTemplateItem[]> {
    const trainer = await this.userModel
      .findById(trainerId)
      .lean<User & { _id: Types.ObjectId }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const templates = await this.nutritionTemplateModel
      .find({ createdBy: new Types.ObjectId(trainerId) })
      .lean<
        (NutritionTemplate & { _id: Types.ObjectId; createdAt: Date })[]
      >();

    return templates.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      dayCount: t.dayTypes.length,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async reassignMember(
    currentTrainerId: string,
    memberId: string,
    newTrainerId: string,
  ): Promise<TrainerMember> {
    const member = await this.userModel.findOne({
      _id: new Types.ObjectId(memberId),
      trainerId: new Types.ObjectId(currentTrainerId),
      role: 'member',
    });

    if (!member) {
      throw new NotFoundException(
        'Member not found under the specified trainer',
      );
    }

    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(memberId),
      { trainerId: new Types.ObjectId(newTrainerId) },
      { new: true },
    );

    return {
      id: memberId,
      name: `${updated!.firstName} ${updated!.lastName}`,
      email: updated!.email,
    };
  }

  private async computeStreak(
    memberObjId: Types.ObjectId,
    now: Date,
  ): Promise<number> {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const sessions = await this.workoutSessionModel
      .find({
        memberId: memberObjId,
        completedAt: { $gte: ninetyDaysAgo },
      })
      .lean();

    const key = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const daySet = new Set(
      sessions.flatMap((s) =>
        s.completedAt ? [key(new Date(s.completedAt))] : [],
      ),
    );

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (daySet.has(key(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
