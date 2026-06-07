import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  PlanTemplate,
  PlanTemplateDocument,
} from '../../common/models/plan-template.model';
import { User, UserDocument, UserRole } from '../../common/models/user.model';
import {
  PersonalBest,
  PersonalBestDocument,
} from '../../common/models/personal-best.model';
import { PatchSetDto } from './dto/patch-set.dto';

@Injectable()
export class TrainingService {
  constructor(
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(PlanTemplate.name)
    private readonly planTemplateModel: Model<PlanTemplateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PersonalBest.name)
    private readonly personalBestModel: Model<PersonalBestDocument>,
  ) {}

  async getMyPlan(memberId: string): Promise<MemberPlanDocument | null> {
    return this.memberPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async assignPlan(
    memberId: string,
    templateId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<MemberPlanDocument> {
    const template = await this.planTemplateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Plan template not found');
    }

    // Template must be owned by the caller
    if (template.createdBy.toString() !== callerId) {
      throw new NotFoundException('Plan template not found');
    }

    // Resolve and scope member
    const member = await this.userModel.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (callerRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }

    // Deactivate existing active plans
    await this.memberPlanModel.updateMany(
      { memberId: new Types.ObjectId(memberId), isActive: true },
      { $set: { isActive: false } },
    );

    return this.memberPlanModel.create({
      memberId: new Types.ObjectId(memberId),
      trainerId: new Types.ObjectId(callerId),
      templateId: new Types.ObjectId(templateId),
      name: template.name,
      days: template.days,
      isActive: true,
      assignedAt: new Date(),
    });
  }

  async startSession(
    memberId: string,
    dayNumber: number,
  ): Promise<WorkoutSessionDocument> {
    const plan = await this.memberPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundException('No active training plan found');
    }

    const day = plan.days.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      throw new NotFoundException(`Day ${dayNumber} not found in active plan`);
    }

    const sets: Array<{
      exerciseId: Types.ObjectId;
      exerciseName: string;
      groupId: string;
      isSuperset: boolean;
      isBodyweight: boolean;
      setNumber: number;
      prescribedRepsMin: number;
      prescribedRepsMax: number;
      isExtraSet: boolean;
      actualReps: null;
      actualWeight: null;
      completedAt: null;
    }> = [];

    for (const exercise of day.exercises) {
      for (let i = 1; i <= exercise.sets; i++) {
        sets.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          groupId: exercise.groupId,
          isSuperset: exercise.isSuperset,
          isBodyweight: exercise.isBodyweight,
          setNumber: i,
          prescribedRepsMin: exercise.repsMin,
          prescribedRepsMax: exercise.repsMax,
          isExtraSet: false,
          actualReps: null,
          actualWeight: null,
          completedAt: null,
        });
      }
    }

    const now = new Date();
    return this.workoutSessionModel.create({
      memberId: new Types.ObjectId(memberId),
      memberPlanId: plan._id,
      dayNumber,
      dayName: day.name,
      startedAt: now,
      completedAt: null,
      lastActivityAt: now,
      autoSealed: false,
      sets,
      loggedBy: null,
      rpe: null,
      memberNote: null,
    });
  }

  async patchSet(
    sessionId: string,
    memberId: string,
    dto: PatchSetDto,
  ): Promise<WorkoutSessionDocument> {
    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    const set = session.sets.find(
      (s) =>
        s.setNumber === dto.setNumber &&
        s.exerciseId.toString() === dto.exerciseId,
    );

    if (!set) {
      throw new BadRequestException('Set not found');
    }

    set.actualReps = dto.actualReps;
    set.actualWeight = dto.actualWeight ?? null;
    set.completedAt = new Date();
    session.lastActivityAt = new Date();

    await session.save();
    return session;
  }

  async finishSession(
    sessionId: string,
    memberId: string,
    rpe?: number,
  ): Promise<WorkoutSessionDocument> {
    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    if (rpe !== undefined) {
      session.rpe = rpe;
    }
    session.completedAt = new Date();
    await session.save();
    return session;
  }

  async addSet(
    sessionId: string,
    memberId: string,
    exerciseId: string,
  ): Promise<WorkoutSessionDocument> {
    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    const exerciseSets = session.sets.filter(
      (s) => s.exerciseId.toString() === exerciseId,
    );

    if (exerciseSets.length === 0) {
      throw new NotFoundException('Exercise not found in session');
    }

    const maxSetNumber = Math.max(...exerciseSets.map((s) => s.setNumber));
    const reference = exerciseSets[0];

    session.sets.push({
      exerciseId: new Types.ObjectId(exerciseId),
      exerciseName: reference.exerciseName,
      groupId: reference.groupId,
      isSuperset: reference.isSuperset,
      isBodyweight: reference.isBodyweight,
      setNumber: maxSetNumber + 1,
      prescribedRepsMin: reference.prescribedRepsMin,
      prescribedRepsMax: reference.prescribedRepsMax,
      isExtraSet: true,
      actualReps: null,
      actualWeight: null,
      completedAt: null,
    });

    session.lastActivityAt = new Date();
    await session.save();
    return session;
  }

  async deleteSet(
    sessionId: string,
    memberId: string,
    exerciseId: string,
    setNumber: number,
  ): Promise<WorkoutSessionDocument> {
    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    const targetIdx = session.sets.findIndex(
      (s) =>
        s.exerciseId.toString() === exerciseId && s.setNumber === setNumber,
    );

    if (targetIdx === -1) {
      throw new NotFoundException('Set not found');
    }

    const target = session.sets[targetIdx];

    if (!target.isExtraSet) {
      throw new BadRequestException('Cannot delete a prescribed set');
    }

    session.sets.splice(targetIdx, 1);
    session.lastActivityAt = new Date();
    await session.save();
    return session;
  }

  private async resolveScopedMember(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<void> {
    const member = await this.userModel.findById(memberId);

    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (callerRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }
  }

  async getMemberPlan(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<MemberPlanDocument | null> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    return this.memberPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async startMemberSession(
    memberId: string,
    dayNumber: number,
    callerId: string,
    callerRole: UserRole,
  ): Promise<WorkoutSessionDocument> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    const plan = await this.memberPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundException('No active training plan found');
    }

    const day = plan.days.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      throw new NotFoundException(`Day ${dayNumber} not found in active plan`);
    }

    const sets: Array<{
      exerciseId: Types.ObjectId;
      exerciseName: string;
      groupId: string;
      isSuperset: boolean;
      isBodyweight: boolean;
      setNumber: number;
      prescribedRepsMin: number;
      prescribedRepsMax: number;
      isExtraSet: boolean;
      actualReps: null;
      actualWeight: null;
      completedAt: null;
    }> = [];

    for (const exercise of day.exercises) {
      for (let i = 1; i <= exercise.sets; i++) {
        sets.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          groupId: exercise.groupId,
          isSuperset: exercise.isSuperset,
          isBodyweight: exercise.isBodyweight,
          setNumber: i,
          prescribedRepsMin: exercise.repsMin,
          prescribedRepsMax: exercise.repsMax,
          isExtraSet: false,
          actualReps: null,
          actualWeight: null,
          completedAt: null,
        });
      }
    }

    const now = new Date();
    return this.workoutSessionModel.create({
      memberId: new Types.ObjectId(memberId),
      memberPlanId: plan._id,
      dayNumber,
      dayName: day.name,
      startedAt: now,
      completedAt: null,
      lastActivityAt: now,
      autoSealed: false,
      sets,
      loggedBy: new Types.ObjectId(callerId),
      rpe: null,
      memberNote: null,
    });
  }

  async patchMemberSet(
    sessionId: string,
    memberId: string,
    callerId: string,
    callerRole: UserRole,
    dto: PatchSetDto,
  ): Promise<WorkoutSessionDocument> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    const set = session.sets.find(
      (s) =>
        s.setNumber === dto.setNumber &&
        s.exerciseId.toString() === dto.exerciseId,
    );

    if (!set) {
      throw new BadRequestException('Set not found');
    }

    set.actualReps = dto.actualReps;
    set.actualWeight = dto.actualWeight ?? null;
    set.completedAt = new Date();
    session.lastActivityAt = new Date();

    await session.save();
    return session;
  }

  async finishMemberSession(
    sessionId: string,
    memberId: string,
    callerId: string,
    callerRole: UserRole,
    rpe?: number,
  ): Promise<WorkoutSessionDocument> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== memberId) {
      throw new NotFoundException('Session not found');
    }

    if (session.completedAt !== null) {
      throw new BadRequestException('Session is already completed');
    }

    if (rpe !== undefined) {
      session.rpe = rpe;
    }
    session.completedAt = new Date();
    await session.save();
    return session;
  }

  async addMemberSet(
    sessionId: string,
    memberId: string,
    callerId: string,
    callerRole: UserRole,
    exerciseId: string,
  ): Promise<WorkoutSessionDocument> {
    await this.resolveScopedMember(memberId, callerId, callerRole);
    return this.addSet(sessionId, memberId, exerciseId);
  }

  async deleteMemberSet(
    sessionId: string,
    memberId: string,
    callerId: string,
    callerRole: UserRole,
    exerciseId: string,
    setNumber: number,
  ): Promise<WorkoutSessionDocument> {
    await this.resolveScopedMember(memberId, callerId, callerRole);
    return this.deleteSet(sessionId, memberId, exerciseId, setNumber);
  }

  async getHistory(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<WorkoutSessionDocument[]> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    return this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $ne: null },
      })
      .sort({ startedAt: -1 });
  }

  async getProgress(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<{
    heatmapDates: string[];
    exercises: { exerciseId: string; exerciseName: string }[];
  }> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const sessions = await this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $ne: null },
      })
      .sort({ completedAt: -1 });

    const dateSet = new Set<string>();
    const exerciseMap = new Map<string, string>();

    for (const session of sessions) {
      const completedAt = session.completedAt as Date;
      if (completedAt >= cutoff) {
        dateSet.add(completedAt.toISOString().slice(0, 10));
      }

      for (const set of session.sets) {
        const exId = set.exerciseId.toString();
        if (!exerciseMap.has(exId)) {
          exerciseMap.set(exId, set.exerciseName);
        }
      }
    }

    const exercises = Array.from(exerciseMap.entries())
      .map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

    return {
      heatmapDates: Array.from(dateSet),
      exercises,
    };
  }

  async getSelfSessions(callerId: string): Promise<WorkoutSessionDocument[]> {
    return this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(callerId),
        completedAt: { $ne: null },
      })
      .sort({ completedAt: -1 });
  }

  async getSelfSession(
    sessionId: string,
    callerId: string,
  ): Promise<WorkoutSessionDocument> {
    const session = await this.workoutSessionModel.findById(sessionId);

    if (!session || session.memberId.toString() !== callerId) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getExerciseHistory(
    memberId: string,
    exerciseId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<{
    exerciseId: string;
    exerciseName: string;
    sessions: {
      sessionId: string;
      date: string;
      sets: { setNumber: number; weight: number; reps: number }[];
      estimatedOneRepMax: number;
    }[];
  }> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    const allSessions = await this.workoutSessionModel
      .find({
        memberId: new Types.ObjectId(memberId),
        completedAt: { $ne: null },
      })
      .sort({ completedAt: -1 });

    let exerciseName = '';
    const result: {
      sessionId: string;
      date: string;
      sets: { setNumber: number; weight: number; reps: number }[];
      estimatedOneRepMax: number;
    }[] = [];

    for (const session of allSessions) {
      const qualifyingSets = session.sets.filter(
        (s) =>
          s.exerciseId.toString() === exerciseId &&
          s.actualWeight !== null &&
          s.actualReps !== null,
      );

      if (qualifyingSets.length === 0) continue;

      if (!exerciseName && qualifyingSets[0].exerciseName) {
        exerciseName = qualifyingSets[0].exerciseName;
      }

      const sets = qualifyingSets.map((s) => ({
        setNumber: s.setNumber,
        weight: s.actualWeight as number,
        reps: s.actualReps as number,
      }));

      const maxOneRM = Math.max(
        ...sets.map((s) => Math.round(s.weight * (1 + s.reps / 30))),
      );

      result.push({
        sessionId: session._id.toString(),
        date: (session.completedAt as Date).toISOString().slice(0, 10),
        sets,
        estimatedOneRepMax: maxOneRM,
      });

      if (result.length === 20) break;
    }

    // Reverse to chronological order (oldest first) for chart x-axis
    result.reverse();

    return {
      exerciseId,
      exerciseName,
      sessions: result,
    };
  }

  async getPersonalBests(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<PersonalBestDocument[]> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    return this.personalBestModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ estimatedOneRM: -1 });
  }

  async getActiveSession(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<WorkoutSessionDocument | null> {
    await this.resolveScopedMember(memberId, callerId, callerRole);

    return this.workoutSessionModel.findOne({
      memberId: new Types.ObjectId(memberId),
      completedAt: null,
    });
  }
}
