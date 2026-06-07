import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TrainersService } from './trainers.service';
import { ReassignMemberDto } from './dto/reassign-member.dto';

@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  findAll() {
    return this.trainersService.findAll();
  }

  // Specific sub-resource routes must be declared BEFORE the catch-all :id route
  // to avoid NestJS treating e.g. "members" as a value for :id.

  @Get(':id/overview-stats')
  getOverviewStats(@Param('id') id: string) {
    return this.trainersService.getOverviewStats(id);
  }

  @Get(':id/members')
  getTrainerMembers(@Param('id') id: string) {
    return this.trainersService.getTrainerMembers(id);
  }

  @Get(':id/sessions')
  getTrainerSessions(@Param('id') id: string) {
    return this.trainersService.getTrainerSessions(id);
  }

  @Get(':id/training-plans')
  getTrainerTrainingPlans(@Param('id') id: string) {
    return this.trainersService.getTrainerTrainingPlans(id);
  }

  @Get(':id/nutrition-plans')
  getTrainerNutritionPlans(@Param('id') id: string) {
    return this.trainersService.getTrainerNutritionPlans(id);
  }

  @Patch(':id/members/:memberId/reassign')
  reassignMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: ReassignMemberDto,
  ) {
    return this.trainersService.reassignMember(id, memberId, dto.trainerId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainersService.remove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainersService.findOne(id);
  }
}
