import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FoodRepository } from '../repositories/food.repository';
import { NutritionTemplateRepository } from '../repositories/nutrition-template.repository';
import { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import { NutritionDailyLogRepository } from '../repositories/nutrition-daily-log.repository';
import { SelfNutritionLogRepository } from '../repositories/self-nutrition-log.repository';
import { UserRepository } from '../repositories/user.repository';
import { FatSecretService, FatSecretFood } from './fatsecret/fatsecret.service';
import type { IFood } from '../database/models/food.model';
import type { INutritionTemplate } from '../database/models/nutrition-template.model';
import type { IMemberNutritionPlan } from '../database/models/member-nutrition-plan.model';
import type { ISelfNutritionLog } from '../database/models/self-nutrition-log.model';
import { CreateFoodDto } from './dto/create-food.dto';
import { CreateNutritionTemplateDto } from './dto/create-nutrition-template.dto';
import { AssignNutritionPlanDto } from './dto/assign-nutrition-plan.dto';
import { LogNutritionDto } from './dto/log-nutrition.dto';

function sumMacros(meals: LogNutritionDto['meals']) {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const meal of meals) {
    for (const item of meal.items) {
      kcal += item.kcal;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;
    }
  }
  return { kcal, protein, carbs, fat };
}

@Injectable()
export class NutritionService {
  constructor(
    private readonly foodRepo: FoodRepository,
    private readonly templateRepo: NutritionTemplateRepository,
    private readonly memberPlanRepo: MemberNutritionPlanRepository,
    private readonly dailyLogRepo: NutritionDailyLogRepository,
    private readonly selfLogRepo: SelfNutritionLogRepository,
    private readonly userRepo: UserRepository,
    private readonly fatSecretService: FatSecretService,
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
        throw new NotFoundException('Member not found');
      }
    }
  }

  // ── Foods ────────────────────────────────────────────────────

  async createFood(caller: AuthUser, dto: CreateFoodDto): Promise<IFood> {
    return this.foodRepo.create({
      createdBy: caller.userId,
      name: dto.name.trim(),
      brand: dto.brand ?? null,
      macrosPer100g: dto.macrosPer100g,
      servings: dto.servings,
    });
  }

  async listFoods(caller: AuthUser, q?: string): Promise<IFood[]> {
    const creatorId =
      caller.role === 'member'
        ? await this.getMemberTrainerId(caller.userId)
        : caller.userId;
    if (!creatorId) return [];
    return this.foodRepo.findVisibleTo(creatorId, q);
  }

  private async getMemberTrainerId(
    memberId: string,
  ): Promise<string | undefined> {
    const member = await this.userRepo.findById(memberId);
    return member?.trainerId?.toString();
  }

  // ── Food Search (FatSecret) ──────────────────────────────────

  async searchFoods(query: string): Promise<FatSecretFood[]> {
    return this.fatSecretService.search(query);
  }

  // ── Nutrition Templates ──────────────────────────────────────

  async listTemplates(caller: AuthUser): Promise<INutritionTemplate[]> {
    return this.templateRepo.findByCreator(caller.userId);
  }

  async createTemplate(
    caller: AuthUser,
    dto: CreateNutritionTemplateDto,
  ): Promise<INutritionTemplate> {
    return this.templateRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      createdBy: caller.userId,
      dayTypes: dto.dayTypes,
    });
  }

  // ── Member Nutrition Plan ────────────────────────────────────

  async getMemberPlan(
    caller: AuthUser,
    memberId: string,
  ): Promise<IMemberNutritionPlan | null> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.memberPlanRepo.findActive(memberId);
  }

  async assignMemberPlan(
    caller: AuthUser,
    memberId: string,
    dto: AssignNutritionPlanDto,
  ): Promise<IMemberNutritionPlan> {
    const member = await this.userRepo.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }
    if (
      caller.role === 'trainer' &&
      member.trainerId?.toString() !== caller.userId
    ) {
      throw new NotFoundException('Member not found');
    }

    await this.memberPlanRepo.deactivateAll(memberId);
    return this.memberPlanRepo.create({
      memberId,
      assignedById: caller.userId,
      templateId: dto.templateId ?? null,
      name: dto.name,
      dayTypes: dto.dayTypes,
      assignedAt: new Date(),
      schedule: dto.schedule,
    });
  }

  // ── Self Nutrition Logs ──────────────────────────────────────

  async getSelfLog(
    caller: AuthUser,
    date: string,
  ): Promise<ISelfNutritionLog | null> {
    return this.selfLogRepo.findByDate(caller.userId, date);
  }

  async logNutrition(
    caller: AuthUser,
    dto: LogNutritionDto,
  ): Promise<{ log: ISelfNutritionLog; totals: ReturnType<typeof sumMacros> }> {
    const log = await this.selfLogRepo.upsertByDate(caller.userId, dto.date, {
      sourceTemplateId: dto.sourceTemplateId ?? null,
      sourceTemplateDayTypeName: dto.sourceTemplateDayTypeName ?? null,
      dayLabel: dto.dayLabel,
      meals: dto.meals,
      dayCompleted: dto.dayCompleted,
    });
    const totals = sumMacros(dto.meals);
    return { log, totals };
  }

  // ── Member Nutrition Recent ──────────────────────────────────

  async getMemberNutritionRecent(
    caller: AuthUser,
    memberId: string,
  ): Promise<{
    loggedToday: boolean;
    recent: Array<{
      foodName: string;
      quantityG: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  }> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Forbidden');
    }
    await this.assertTrainerOwnsMember(caller, memberId);

    const today = new Date().toISOString().slice(0, 10);

    // loggedToday: check BOTH NutritionDailyLog (plan-based) AND SelfNutritionLog (freestyle)
    const [planLogged, selfLogged] = await Promise.all([
      this.dailyLogRepo.existsForDate(memberId, today),
      this.selfLogRepo.existsForDate(memberId, today),
    ]);
    const loggedToday = planLogged || selfLogged;

    const LIMIT = 20;
    const LOG_LOOKBACK_DAYS = 30;
    const logs = await this.dailyLogRepo.findRecent(
      memberId,
      LOG_LOOKBACK_DAYS,
    );

    const seen = new Set<string>();
    const recent: Array<{
      foodName: string;
      quantityG: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }> = [];

    outer: for (const log of logs) {
      for (const meal of log.meals) {
        for (const item of meal.items) {
          if (seen.has(item.foodName)) continue;
          seen.add(item.foodName);
          recent.push({
            foodName: item.foodName,
            quantityG: item.quantityG,
            kcal: item.kcal,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          });
          if (recent.length >= LIMIT) break outer;
        }
      }
    }

    return { loggedToday, recent };
  }
}
