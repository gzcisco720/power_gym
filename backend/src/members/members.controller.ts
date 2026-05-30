import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { MembersService } from './members.service';
import type { ISchedule } from '../repositories/member-nutrition-plan.repository';
import type { IDayType } from '../database/models/nutrition-template.model';

interface AssignPlanBody {
  templateId: string;
}

interface AssignNutritionBody {
  name: string;
  dayTypes: IDayType[];
  schedule: ISchedule;
  templateId?: string;
}

@Roles('owner', 'trainer')
@Controller('members')
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @Get(':id/profile')
  getProfile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getProfile(id, user.userId, user.role);
  }

  @Get(':id/plan')
  getActivePlan(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getActivePlan(id, user.userId, user.role);
  }

  @Post(':id/plan')
  @HttpCode(HttpStatus.CREATED)
  assignPlan(
    @Param('id') id: string,
    @Body() body: AssignPlanBody,
    @CurrentUser() user: AuthUser,
  ) {
    if (!body.templateId)
      throw new BadRequestException('templateId is required');
    return this.service.assignPlan(id, body.templateId, user.userId, user.role);
  }

  @Get(':id/nutrition')
  getActiveNutrition(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getActiveNutrition(id, user.userId, user.role);
  }

  @Get(':id/nutrition/history')
  getNutritionHistory(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getNutritionHistory(id, user.userId, user.role);
  }

  @Patch(':id/nutrition/schedule')
  updateNutritionSchedule(
    @Param('id') id: string,
    @Body() body: ISchedule,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateNutritionSchedule(
      id,
      body,
      user.userId,
      user.role,
    );
  }

  @Post(':id/nutrition')
  @HttpCode(HttpStatus.CREATED)
  assignNutrition(
    @Param('id') id: string,
    @Body() body: AssignNutritionBody,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assignNutrition(id, body, user.userId, user.role);
  }

  @Get(':id/pbs')
  getPbs(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getPbs(id, user.userId, user.role);
  }

  @Get(':id/exercise-last-weights')
  getLastWeights(
    @Param('id') id: string,
    @Query('exerciseIds') exerciseIdsParam: string,
    @CurrentUser() user: AuthUser,
  ) {
    const exerciseIds = exerciseIdsParam
      ? exerciseIdsParam.split(',').filter(Boolean)
      : [];
    return this.service.getLastWeights(id, exerciseIds, user.userId, user.role);
  }
}
