import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { NutritionService } from './nutrition.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { CreateNutritionTemplateDto } from './dto/create-nutrition-template.dto';
import { AssignNutritionPlanDto } from './dto/assign-nutrition-plan.dto';
import { LogNutritionDto } from './dto/log-nutrition.dto';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Controller()
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  // ── Foods ────────────────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Post('foods')
  @HttpCode(HttpStatus.CREATED)
  async createFood(@CurrentUser() user: AuthUser, @Body() dto: CreateFoodDto) {
    const food = await this.nutritionService.createFood(user, dto);
    const obj = food.toObject() as Record<string, unknown> & {
      macrosPer100g: { protein: number };
    };
    return { ...obj, proteinPer100g: obj.macrosPer100g.protein };
  }

  @Get('foods')
  listFoods(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.nutritionService.listFoods(user, q);
  }

  // ── Food Search ──────────────────────────────────────────────

  @Get('food-search')
  async searchFoods(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('q is required');
    }
    try {
      const results = await this.nutritionService.searchFoods(q.trim());
      return { results };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException('Upstream search failed');
    }
  }

  // ── Nutrition Templates ──────────────────────────────────────

  @Roles('owner', 'trainer')
  @Get('nutrition-templates')
  listTemplates(@CurrentUser() user: AuthUser) {
    return this.nutritionService.listTemplates(user);
  }

  @Roles('owner', 'trainer')
  @Post('nutrition-templates')
  @HttpCode(HttpStatus.CREATED)
  createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateNutritionTemplateDto,
  ) {
    return this.nutritionService.createTemplate(user, dto);
  }

  // ── Member Nutrition Plan ────────────────────────────────────

  @Get('members/:memberId/nutrition')
  getMemberPlan(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.nutritionService.getMemberPlan(user, memberId.toString());
  }

  @Roles('owner', 'trainer')
  @Put('members/:memberId/nutrition')
  @HttpCode(HttpStatus.OK)
  assignMemberPlan(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: AssignNutritionPlanDto,
  ) {
    return this.nutritionService.assignMemberPlan(
      user,
      memberId.toString(),
      dto,
    );
  }

  @Get('members/:memberId/nutrition/recent')
  getMemberNutritionRecent(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.nutritionService.getMemberNutritionRecent(
      user,
      memberId.toString(),
    );
  }

  // ── Self Nutrition Logs ──────────────────────────────────────

  @Get('me/nutrition-logs/:date')
  getSelfLog(@CurrentUser() user: AuthUser, @Param('date') date: string) {
    if (!DATE_RE.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.nutritionService.getSelfLog(user, date);
  }

  @Post('me/nutrition-logs')
  @HttpCode(HttpStatus.CREATED)
  logNutrition(@CurrentUser() user: AuthUser, @Body() dto: LogNutritionDto) {
    return this.nutritionService.logNutrition(user, dto);
  }
}
