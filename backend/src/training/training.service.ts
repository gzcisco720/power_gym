import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { ExerciseRepository } from '../repositories/exercise.repository';
import { ExerciseNoteRepository } from '../repositories/exercise-note.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { SelfWorkoutLogRepository } from '../repositories/self-workout-log.repository';
import { SelfPersonalBestRepository } from '../repositories/self-personal-best.repository';
import { UserRepository } from '../repositories/user.repository';
import type { IPlanTemplate } from '../database/models/plan-template.model';
import type { IMemberPlan } from '../database/models/member-plan.model';
import type { IWorkoutSession } from '../database/models/workout-session.model';
import type { IPersonalBest } from '../database/models/personal-best.model';
import type { IExercise } from '../database/models/exercise.model';
import type { IExerciseNote } from '../database/models/exercise-note.model';
import type { IPlanDay } from '../database/models/plan-template.model';
import {
  CreatePlanTemplateDto,
  PlanDayDto,
} from './dto/create-plan-template.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { CreateExerciseNoteDto } from './dto/create-exercise-note.dto';

function csvCell(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toPlanDays(dtos: PlanDayDto[]): IPlanDay[] {
  return dtos.map((d) => ({
    dayNumber: d.dayNumber,
    name: d.name,
    exercises: d.exercises.map((ex) => ({
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      exerciseId: new Types.ObjectId(ex.exerciseId),
      exerciseName: ex.exerciseName,
      imageUrl: ex.imageUrl ?? null,
      isBodyweight: ex.isBodyweight,
      sets: ex.sets,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      restSeconds: ex.restSeconds ?? null,
    })),
  }));
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly planTemplateRepo: PlanTemplateRepository,
    private readonly memberPlanRepo: MemberPlanRepository,
    private readonly sessionRepo: WorkoutSessionRepository,
    private readonly exerciseRepo: ExerciseRepository,
    private readonly exerciseNoteRepo: ExerciseNoteRepository,
    private readonly pbRepo: PersonalBestRepository,
    private readonly selfLogRepo: SelfWorkoutLogRepository,
    private readonly selfPbRepo: SelfPersonalBestRepository,
    private readonly userRepo: UserRepository,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────

  private async assertTrainerOwnsMember(
    caller: AuthUser,
    memberId: string,
  ): Promise<void> {
    if (caller.role === 'owner') return;
    if (caller.role === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new ForbiddenException('Forbidden');
      }
    }
  }

  // ── Plan Templates ─────────────────────────────────────────

  async listPlanTemplates(caller: AuthUser): Promise<IPlanTemplate[]> {
    return this.planTemplateRepo.findByCreator(caller.userId);
  }

  async createPlanTemplate(
    caller: AuthUser,
    dto: CreatePlanTemplateDto,
  ): Promise<IPlanTemplate> {
    return this.planTemplateRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      createdBy: caller.userId,
      days: toPlanDays(dto.days),
    });
  }

  async getPlanTemplate(caller: AuthUser, id: string): Promise<IPlanTemplate> {
    const tmpl = await this.planTemplateRepo.findById(id);
    if (!tmpl) throw new NotFoundException('Template not found');
    if (
      caller.role !== 'owner' &&
      tmpl.createdBy.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    return tmpl;
  }

  async updatePlanTemplate(
    caller: AuthUser,
    id: string,
    dto: Partial<CreatePlanTemplateDto>,
  ): Promise<IPlanTemplate> {
    const tmpl = await this.planTemplateRepo.findById(id);
    if (!tmpl) throw new NotFoundException('Template not found');
    if (
      caller.role !== 'owner' &&
      tmpl.createdBy.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    const updateData: {
      name?: string;
      description?: string | null;
      days?: IPlanDay[];
    } = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.days !== undefined) updateData.days = toPlanDays(dto.days);
    const updated = await this.planTemplateRepo.update(id, updateData);
    if (!updated) throw new NotFoundException('Template not found');
    return updated;
  }

  async deletePlanTemplate(caller: AuthUser, id: string): Promise<void> {
    const deleted = await this.planTemplateRepo.deleteById(id, caller.userId);
    if (!deleted) throw new NotFoundException('Template not found');
  }

  // ── Member Plans ────────────────────────────────────────────

  async getMemberPlan(
    caller: AuthUser,
    memberId: string,
  ): Promise<IMemberPlan | null> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.memberPlanRepo.findActive(memberId);
  }

  async assignMemberPlan(
    caller: AuthUser,
    memberId: string,
    templateId: string,
  ): Promise<IMemberPlan> {
    const member = await this.userRepo.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }
    if (
      caller.role === 'trainer' &&
      member.trainerId?.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    const template = await this.planTemplateRepo.findById(templateId);
    if (!template) throw new NotFoundException('Template not found');
    if (
      caller.role === 'trainer' &&
      template.createdBy?.toString() !== caller.userId
    ) {
      throw new ForbiddenException('You can only assign your own templates');
    }

    await this.memberPlanRepo.deactivateAll(memberId);
    const rawTemplate = template.toObject() as { days: IPlanDay[] };
    return this.memberPlanRepo.create({
      memberId,
      trainerId: caller.userId,
      templateId,
      name: template.name,
      days: rawTemplate.days,
      assignedAt: new Date(),
    });
  }

  // ── Sessions ────────────────────────────────────────────────

  async startSession(
    caller: AuthUser,
    dto: StartSessionDto,
  ): Promise<IWorkoutSession> {
    const targetMemberId =
      (caller.role === 'trainer' || caller.role === 'owner') && dto.memberId
        ? dto.memberId
        : caller.userId;

    const loggedBy = targetMemberId !== caller.userId ? caller.userId : null;

    // Ownership check for trainers
    if (caller.role === 'trainer' && dto.memberId) {
      const member = await this.userRepo.findById(targetMemberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const plan = await this.memberPlanRepo.findActive(targetMemberId);
    if (!plan) throw new NotFoundException('No active plan');

    const day = plan.days.find((d) => d.dayNumber === dto.dayNumber);
    if (!day) throw new NotFoundException('Day not found');

    const activeSession = await this.sessionRepo.findActive(targetMemberId);
    if (activeSession) {
      if (activeSession.dayNumber === dto.dayNumber) {
        return activeSession;
      }
      if (!dto.deleteActive) {
        throw new ConflictException({
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            _id: activeSession._id.toString(),
            dayName: activeSession.dayName,
            dayNumber: activeSession.dayNumber,
            startedAt: activeSession.startedAt,
            setCount: activeSession.sets.filter((s) => s.completedAt !== null)
              .length,
          },
        });
      }
      await this.sessionRepo.delete(activeSession._id.toString());
    }

    const completedToday =
      await this.sessionRepo.findCompletedToday(targetMemberId);
    if (completedToday) {
      throw new ConflictException({
        error: 'DAY_ALREADY_LOGGED',
        session: {
          _id: completedToday._id.toString(),
          dayName: completedToday.dayName,
        },
      });
    }

    const sets = day.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        groupId: ex.groupId,
        isSuperset: ex.isSuperset,
        isBodyweight: ex.isBodyweight,
        setNumber: i + 1,
        prescribedRepsMin: ex.repsMin,
        prescribedRepsMax: ex.repsMax,
        isExtraSet: false,
        actualWeight: null,
        actualReps: null,
      })),
    );

    return this.sessionRepo.create({
      memberId: targetMemberId,
      memberPlanId: plan._id.toString(),
      dayNumber: dto.dayNumber,
      dayName: day.name,
      startedAt: new Date(),
      sets,
      loggedBy,
    });
  }

  async listSessions(
    caller: AuthUser,
    memberId: string,
  ): Promise<IWorkoutSession[]> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.sessionRepo.findByMember(memberId);
  }

  async getSession(caller: AuthUser, id: string): Promise<IWorkoutSession> {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    if (
      caller.role === 'member' &&
      session.memberId.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, session.memberId.toString());
    return session;
  }

  async updateSet(
    caller: AuthUser,
    id: string,
    setIndex: number,
    dto: UpdateSetDto,
  ): Promise<IWorkoutSession> {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    if (
      caller.role === 'member' &&
      session.memberId.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, session.memberId.toString());
    if (session.completedAt) {
      throw new ConflictException('Session already completed');
    }

    const updated = await this.sessionRepo.updateSet(id, setIndex, {
      actualWeight: dto.actualWeight,
      actualReps: dto.actualReps,
    });
    if (!updated) throw new NotFoundException('Session not found');

    const targetSet = session.sets[setIndex];
    if (
      dto.actualWeight !== null &&
      dto.actualReps !== null &&
      !targetSet.isBodyweight
    ) {
      await this.pbRepo.upsertIfBetter({
        memberId: session.memberId.toString(),
        exerciseId: targetSet.exerciseId.toString(),
        exerciseName: targetSet.exerciseName,
        weight: dto.actualWeight,
        reps: dto.actualReps,
        sessionId: id,
      });
    }

    return updated;
  }

  async completeSession(
    caller: AuthUser,
    id: string,
    rpe?: number,
    memberNote?: string,
  ): Promise<IWorkoutSession> {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    if (
      caller.role === 'member' &&
      session.memberId.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, session.memberId.toString());
    if (session.completedAt) {
      throw new ConflictException('Session already completed');
    }
    const completed = await this.sessionRepo.complete(id, { rpe, memberNote });
    if (!completed) throw new NotFoundException('Session not found');
    return completed;
  }

  async sealSession(caller: AuthUser, id: string): Promise<IWorkoutSession> {
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    if (
      caller.role === 'member' &&
      session.memberId.toString() !== caller.userId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, session.memberId.toString());
    const sealed = await this.sessionRepo.seal(id);
    if (!sealed) throw new NotFoundException('Session not found');
    return sealed;
  }

  // ── Personal Bests ──────────────────────────────────────────

  async getMemberPbs(
    caller: AuthUser,
    memberId: string,
  ): Promise<IPersonalBest[]> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.pbRepo.findByMember(memberId);
  }

  // ── Exercises ───────────────────────────────────────────────

  async listExercises(caller: AuthUser): Promise<IExercise[]> {
    const creatorId =
      caller.role === 'owner' || caller.role === 'trainer'
        ? caller.userId
        : null;
    return this.exerciseRepo.findAll(creatorId);
  }

  // ── Exercise Notes ──────────────────────────────────────────

  async createExerciseNote(
    caller: AuthUser,
    dto: CreateExerciseNoteDto,
  ): Promise<IExerciseNote> {
    if (caller.role === 'trainer') {
      const member = await this.userRepo.findById(dto.memberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new ForbiddenException('Forbidden');
      }
    }
    const note = await this.exerciseNoteRepo.appendEntry({
      memberId: dto.memberId,
      exerciseId: dto.exerciseId,
      exerciseName: dto.exerciseName,
      trainerId: caller.userId,
      content: dto.content,
      sessionId: dto.sessionId ?? null,
    });
    if (!note) throw new NotFoundException('Could not create note');
    return note;
  }

  async getExerciseNote(
    caller: AuthUser,
    memberId: string,
    exerciseId: string,
  ): Promise<IExerciseNote | null> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    return this.exerciseNoteRepo.findByMemberAndExercise(memberId, exerciseId);
  }

  // ── Session CSV Export ──────────────────────────────────────

  async exportSessionsCsv(caller: AuthUser, memberId: string): Promise<string> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);
    const sessions = await this.sessionRepo.findByMember(memberId);
    const rows: string[] = [
      'date,dayName,exerciseName,setNumber,actualWeight,actualReps',
    ];
    for (const s of sessions) {
      for (const set of s.sets) {
        if (set.completedAt !== null) {
          rows.push(
            [
              csvCell(s.startedAt.toISOString().slice(0, 10)),
              csvCell(s.dayName),
              csvCell(set.exerciseName),
              csvCell(set.setNumber),
              csvCell(set.actualWeight ?? ''),
              csvCell(set.actualReps ?? ''),
            ].join(','),
          );
        }
      }
    }
    return rows.join('\n');
  }
}
