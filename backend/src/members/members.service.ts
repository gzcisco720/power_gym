import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { MemberPlanRepository } from '../repositories/member-plan.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import type { ISchedule } from '../repositories/member-nutrition-plan.repository';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import type { IMemberPlan } from '../database/models/member-plan.model';
import type { IMemberNutritionPlan } from '../database/models/member-nutrition-plan.model';
import type { IPersonalBest } from '../database/models/personal-best.model';
import type { IUserProfile } from '../database/models/user-profile.model';
import type { IDayType } from '../database/models/nutrition-template.model';
import type { UserRole } from '../common/interfaces/auth-user.interface';

@Injectable()
export class MembersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: UserProfileRepository,
    private readonly memberPlanRepo: MemberPlanRepository,
    private readonly nutritionPlanRepo: MemberNutritionPlanRepository,
    private readonly pbRepo: PersonalBestRepository,
    private readonly sessionRepo: WorkoutSessionRepository,
    private readonly planTemplateRepo: PlanTemplateRepository,
  ) {}

  private async assertOwnership(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    if (requesterRole === 'owner') return;
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.trainerId?.toString() !== requesterId) {
      throw new ForbiddenException('Forbidden');
    }
  }

  async listForTrainer(
    trainerId: string,
  ): Promise<{ _id: string; name: string; email: string; trainerId: string | null; createdAt: Date }[]> {
    const members = await this.userRepo.findAllMembers(trainerId);
    return members.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      trainerId: m.trainerId?.toString() ?? null,
      createdAt: m.createdAt,
    }));
  }

  async getProfile(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{ _id: string; name: string; email: string; createdAt: Date; profile: IUserProfile | null }> {
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (
      requesterRole === 'trainer' &&
      member.trainerId?.toString() !== requesterId
    ) {
      throw new ForbiddenException('Forbidden');
    }
    const profile = await this.profileRepo.findByUserId(memberId);
    return {
      _id: member._id.toString(),
      name: member.name,
      email: member.email,
      createdAt: member.createdAt,
      profile,
    };
  }

  async getActivePlan(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberPlan | null> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    return this.memberPlanRepo.findActive(memberId);
  }

  async assignPlan(
    memberId: string,
    templateId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberPlan> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    const template = await this.planTemplateRepo.findById(templateId);
    if (!template) throw new NotFoundException('Template not found');
    await this.memberPlanRepo.deactivateAll(memberId);
    return this.memberPlanRepo.create({
      memberId,
      trainerId: requesterId,
      templateId,
      name: template.name,
      days: template.days,
      assignedAt: new Date(),
    });
  }

  async assignNutrition(
    memberId: string,
    data: {
      name: string;
      dayTypes: IDayType[];
      schedule: ISchedule;
      templateId?: string;
    },
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberNutritionPlan> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    await this.nutritionPlanRepo.deactivateAll(memberId);
    return this.nutritionPlanRepo.create({
      memberId,
      assignedById: requesterId,
      templateId: data.templateId ?? null,
      name: data.name,
      dayTypes: data.dayTypes,
      assignedAt: new Date(),
      schedule: data.schedule,
    });
  }

  async getActiveNutrition(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberNutritionPlan | null> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    return this.nutritionPlanRepo.findActive(memberId);
  }

  async getNutritionHistory(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberNutritionPlan[]> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    return this.nutritionPlanRepo.findAllByMember(memberId);
  }

  async updateNutritionSchedule(
    memberId: string,
    schedule: ISchedule,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberNutritionPlan | null> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    const updated = await this.nutritionPlanRepo.updateSchedule(
      memberId,
      schedule,
    );
    if (!updated) throw new NotFoundException('No active nutrition plan');
    return updated;
  }

  async getPbs(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IPersonalBest[]> {
    await this.assertOwnership(memberId, requesterId, requesterRole);
    return this.pbRepo.findByMember(memberId);
  }

  async getLastWeights(
    memberId: string,
    exerciseIds: string[],
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{
    hints: {
      exerciseId: string;
      lastWeight: number;
      lastReps: number;
      lastDate: string;
      consecutiveMaxHits: number;
    }[];
  }> {
    if (exerciseIds.length === 0) return { hints: [] };
    await this.assertOwnership(memberId, requesterId, requesterRole);
    const hints = await this.sessionRepo.findLastWeightsForExercises(
      memberId,
      exerciseIds,
    );
    return {
      hints: hints.map((h) => ({
        exerciseId: h.exerciseId,
        lastWeight: h.lastWeight,
        lastReps: h.lastReps,
        lastDate: h.lastDate.toISOString(),
        consecutiveMaxHits: h.consecutiveMaxHits,
      })),
    };
  }

  async getProgress(
    memberId: string,
    exerciseId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<{
    history: {
      date: string;
      estimatedOneRM: number;
      bestWeight: number;
      bestReps: number;
    }[];
  }> {
    if (!exerciseId) throw new BadRequestException('exerciseId is required');
    await this.assertOwnership(memberId, requesterId, requesterRole);
    const history = await this.sessionRepo.findExerciseHistory(
      memberId,
      exerciseId,
    );
    return {
      history: history.map((h) => ({
        date: h.date.toISOString().split('T')[0],
        estimatedOneRM: h.estimatedOneRM,
        bestWeight: h.bestWeight,
        bestReps: h.bestReps,
      })),
    };
  }
}
