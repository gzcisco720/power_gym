import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { TrainingService } from './training.service';
import { CreatePlanTemplateDto } from './dto/create-plan-template.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { CreateExerciseNoteDto } from './dto/create-exercise-note.dto';

@Controller()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ── Plan Templates ──────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Get('plan-templates')
  listPlanTemplates(@CurrentUser() user: AuthUser) {
    return this.trainingService.listPlanTemplates(user);
  }

  @Roles('owner', 'trainer')
  @Post('plan-templates')
  @HttpCode(HttpStatus.CREATED)
  createPlanTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlanTemplateDto,
  ) {
    return this.trainingService.createPlanTemplate(user, dto);
  }

  @Roles('owner', 'trainer')
  @Get('plan-templates/:id')
  getPlanTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.trainingService.getPlanTemplate(user, id.toString());
  }

  @Roles('owner', 'trainer')
  @Patch('plan-templates/:id')
  updatePlanTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: Partial<CreatePlanTemplateDto>,
  ) {
    return this.trainingService.updatePlanTemplate(user, id.toString(), dto);
  }

  @Roles('owner', 'trainer')
  @Delete('plan-templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlanTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    await this.trainingService.deletePlanTemplate(user, id.toString());
  }

  // ── Member Plans ────────────────────────────────────────────

  @Get('members/:memberId/plan')
  getMemberPlan(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.trainingService.getMemberPlan(user, memberId.toString());
  }

  @Roles('owner', 'trainer')
  @Post('members/:memberId/plan')
  @HttpCode(HttpStatus.CREATED)
  assignMemberPlan(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body('templateId') templateId: string,
  ) {
    return this.trainingService.assignMemberPlan(
      user,
      memberId.toString(),
      templateId,
    );
  }

  // ── Sessions ────────────────────────────────────────────────

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  startSession(@CurrentUser() user: AuthUser, @Body() dto: StartSessionDto) {
    return this.trainingService.startSession(user, dto);
  }

  @Get('sessions')
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId: string,
  ) {
    return this.trainingService.listSessions(user, memberId);
  }

  @Get('sessions/:id')
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.trainingService.getSession(user, id.toString());
  }

  @Patch('sessions/:id/sets/:setIndex')
  updateSet(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Param('setIndex', ParseIntPipe) setIndex: number,
    @Body() dto: UpdateSetDto,
  ) {
    return this.trainingService.updateSet(user, id.toString(), setIndex, dto);
  }

  @Post('sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  completeSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() body: { rpe?: number; memberNote?: string },
  ) {
    return this.trainingService.completeSession(
      user,
      id.toString(),
      body.rpe,
      body.memberNote,
    );
  }

  @Post('sessions/:id/seal')
  @HttpCode(HttpStatus.OK)
  sealSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.trainingService.sealSession(user, id.toString());
  }

  // ── Personal Bests ──────────────────────────────────────────

  @Get('members/:memberId/pbs')
  getMemberPbs(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.trainingService.getMemberPbs(user, memberId.toString());
  }

  // ── Exercises ───────────────────────────────────────────────

  @Get('exercises')
  listExercises(@CurrentUser() user: AuthUser) {
    return this.trainingService.listExercises(user);
  }

  // ── Exercise Notes ──────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Post('exercise-notes')
  @HttpCode(HttpStatus.CREATED)
  createExerciseNote(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExerciseNoteDto,
  ) {
    return this.trainingService.createExerciseNote(user, dto);
  }

  @Get('exercise-notes')
  getExerciseNote(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId: string,
    @Query('exerciseId') exerciseId: string,
  ) {
    return this.trainingService.getExerciseNote(user, memberId, exerciseId);
  }

  // ── Session CSV Export ──────────────────────────────────────

  @Get('members/:memberId/sessions/export')
  async exportMemberSessions(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Res() res: Response,
  ) {
    const csv = await this.trainingService.exportSessionsCsv(
      user,
      memberId.toString(),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sessions-${memberId.toString()}.csv"`,
    );
    res.send(csv);
  }
}
