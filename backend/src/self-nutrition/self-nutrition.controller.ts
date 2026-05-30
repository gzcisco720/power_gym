import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { SelfNutritionService } from './self-nutrition.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { ISelfMeal } from '../database/models/self-nutrition-log.model';

interface JwtPayload {
  sub: string;
  role: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class UpsertDayDto {
  sourceTemplateId!: string | null;
  sourceTemplateDayTypeName!: string | null;
  dayLabel!: string;
  meals!: ISelfMeal[];
  dayCompleted!: boolean;
}

@Controller('me/nutrition-logs')
@Roles('owner', 'trainer', 'member')
export class SelfNutritionController {
  constructor(private readonly svc: SelfNutritionService) {}

  @Get()
  async listMonth(
    @CurrentUser() user: JwtPayload,
    @Query('year') yearParam: string,
    @Query('month') monthParam: string,
  ) {
    if (!yearParam || !monthParam) {
      throw new BadRequestException('year and month required');
    }
    const limit = 40;
    return this.svc.listRecent(user.sub, limit);
  }

  @Get(':date')
  async getDay(@CurrentUser() user: JwtPayload, @Param('date') date: string) {
    if (!DATE_RE.test(date)) throw new BadRequestException('Invalid date');
    return this.svc.getDay(user.sub, date);
  }

  @Put(':date')
  async upsertDay(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
    @Body() body: UpsertDayDto,
  ) {
    if (!DATE_RE.test(date)) throw new BadRequestException('Invalid date');
    return this.svc.upsertDay(user.sub, date, {
      sourceTemplateId: body.sourceTemplateId ?? null,
      sourceTemplateDayTypeName: body.sourceTemplateDayTypeName ?? null,
      dayLabel: body.dayLabel,
      meals: body.meals ?? [],
      dayCompleted: body.dayCompleted ?? false,
    });
  }

  @Delete(':date')
  @HttpCode(204)
  async deleteDay(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
  ) {
    if (!DATE_RE.test(date)) throw new BadRequestException('Invalid date');
    const ok = await this.svc.getDay(user.sub, date);
    if (!ok) throw new NotFoundException('Not found');
  }
}
