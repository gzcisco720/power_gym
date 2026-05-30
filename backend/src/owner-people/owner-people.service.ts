import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';

export interface TrainerListItem {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  memberCount: number;
  sessionsThisMonth: number;
}

export interface TrainerDetail extends TrainerListItem {
  templateCount: number;
}

export interface MemberListItem {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  createdAt: Date;
}

export interface TrainerMemberItem {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  streak: number;
  sessionsThisMonth: number;
  status: 'active' | 'needs-attn' | 'no-plan';
}

@Injectable()
export class OwnerPeopleService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: WorkoutSessionRepository,
    private readonly planTemplateRepo: PlanTemplateRepository,
    private readonly nutritionTemplateRepo: NutritionTemplateRepository,
    private readonly scheduledSessionRepo: ScheduledSessionRepository,
  ) {}

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  async listTrainers(): Promise<TrainerListItem[]> {
    const trainers = await this.userRepo.findByRole('trainer');
    const since = this.startOfMonth();

    return Promise.all(
      trainers.map(async (trainer) => {
        const members = await this.userRepo.findAllMembers(
          trainer._id.toString(),
        );
        const memberIds = members.map((m) => m._id.toString());
        const sessionsThisMonth =
          memberIds.length > 0
            ? await this.sessionRepo.countByMemberIdsSince(memberIds, since)
            : 0;
        return {
          _id: trainer._id.toString(),
          name: trainer.name,
          email: trainer.email,
          createdAt: trainer.createdAt,
          memberCount: members.length,
          sessionsThisMonth,
        };
      }),
    );
  }

  async getTrainerById(id: string): Promise<TrainerDetail> {
    const trainer = await this.userRepo.findById(id);
    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const since = this.startOfMonth();
    const members = await this.userRepo.findAllMembers(id);
    const memberIds = members.map((m) => m._id.toString());

    const [sessionsThisMonth, planTemplates] = await Promise.all([
      memberIds.length > 0
        ? this.sessionRepo.countByMemberIdsSince(memberIds, since)
        : Promise.resolve(0),
      this.planTemplateRepo.findByCreator(id),
    ]);

    return {
      _id: trainer._id.toString(),
      name: trainer.name,
      email: trainer.email,
      createdAt: trainer.createdAt,
      memberCount: members.length,
      sessionsThisMonth,
      templateCount: planTemplates.length,
    };
  }

  async getTrainerMembers(trainerId: string): Promise<TrainerMemberItem[]> {
    const members = await this.userRepo.findAllMembers(trainerId);
    const since = this.startOfMonth();

    return Promise.all(
      members.map(async (m) => {
        const memberId = m._id.toString();
        const sessionsThisMonth = await this.sessionRepo.countByMemberIdsSince(
          [memberId],
          since,
        );
        const status: 'active' | 'needs-attn' | 'no-plan' =
          sessionsThisMonth > 0 ? 'active' : 'needs-attn';
        return {
          _id: memberId,
          name: m.name,
          email: m.email,
          trainerId: m.trainerId?.toString() ?? null,
          streak: 0,
          sessionsThisMonth,
          status,
        };
      }),
    );
  }

  async getTrainerPlans(
    trainerId: string,
  ): Promise<
    { _id: string; name: string; daysCount: number; createdAt: Date }[]
  > {
    const templates = await this.planTemplateRepo.findByCreator(trainerId);
    return templates.map((t) => ({
      _id: t._id.toString(),
      name: t.name,
      daysCount: t.days.length,
      createdAt: t.createdAt,
    }));
  }

  async getTrainerNutritionPlans(
    trainerId: string,
  ): Promise<
    { _id: string; name: string; dayTypesCount: number; createdAt: Date }[]
  > {
    const templates = await this.nutritionTemplateRepo.findByCreator(trainerId);
    return templates.map((t) => ({
      _id: t._id.toString(),
      name: t.name,
      dayTypesCount: t.dayTypes.length,
      createdAt: t.createdAt,
    }));
  }

  async getTrainerCalendar(
    trainerId: string,
  ): Promise<{ _id: string; name: string; trainerId: string }[]> {
    const members = await this.userRepo.findAllMembers(trainerId);
    return members.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      trainerId: m.trainerId?.toString() ?? '',
    }));
  }

  async listMembers(trainerId?: string): Promise<MemberListItem[]> {
    const members = await this.userRepo.findAllMembers(trainerId);
    return members.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      email: m.email,
      trainerId: m.trainerId?.toString() ?? null,
      createdAt: m.createdAt,
    }));
  }

  async reassignTrainer(
    memberId: string,
    trainerId: string | null,
  ): Promise<void> {
    const member = await this.userRepo.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }
    await this.userRepo.updateTrainerId(memberId, trainerId);
  }
}
