import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { TrainingService } from './training.service';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { PatchSetDto } from './dto/patch-set.dto';
import { FinishSessionDto } from './dto/finish-session.dto';
import { AddSetDto } from './dto/add-set.dto';
import { DeleteSetDto } from './dto/delete-set.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('my-plan')
  @Roles('member')
  async getMyPlan(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const plan = await this.trainingService.getMyPlan(req.user.sub);
    if (plan === null) {
      res.setHeader('Content-Type', 'application/json');
      res.send('null');
      return;
    }
    return plan;
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @Roles('member')
  startSession(@Request() req: RequestWithUser, @Body() dto: StartSessionDto) {
    return this.trainingService.startSession(req.user.sub, dto.dayNumber);
  }

  @Patch('sessions/:id/sets')
  @Roles('member')
  patchSet(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: PatchSetDto,
  ) {
    return this.trainingService.patchSet(id, req.user.sub, dto);
  }

  @Post('sessions/:id/finish')
  @HttpCode(HttpStatus.OK)
  @Roles('member')
  finishSession(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: FinishSessionDto,
  ) {
    return this.trainingService.finishSession(id, req.user.sub, dto.rpe);
  }

  @Post('sessions/:id/sets/add')
  @HttpCode(HttpStatus.OK)
  @Roles('member')
  addSet(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: AddSetDto,
  ) {
    return this.trainingService.addSet(id, req.user.sub, dto.exerciseId);
  }

  @Delete('sessions/:id/sets')
  @HttpCode(HttpStatus.OK)
  @Roles('member')
  deleteSet(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: DeleteSetDto,
  ) {
    return this.trainingService.deleteSet(
      id,
      req.user.sub,
      dto.exerciseId,
      dto.setNumber,
    );
  }

  @Get('self/sessions')
  @Roles('owner', 'trainer')
  getSelfSessions(@Request() req: RequestWithUser) {
    return this.trainingService.getSelfSessions(req.user.sub);
  }

  @Get('self/sessions/:id')
  @Roles('owner', 'trainer')
  getSelfSession(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.trainingService.getSelfSession(id, req.user.sub);
  }

  @Post('members/:memberId/assign-plan')
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'trainer')
  assignPlan(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.trainingService.assignPlan(
      memberId,
      dto.templateId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/plan')
  @Roles('owner', 'trainer')
  async getMemberPlan(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const plan = await this.trainingService.getMemberPlan(
      memberId,
      req.user.sub,
      req.user.role,
    );
    if (plan === null) {
      res.setHeader('Content-Type', 'application/json');
      res.send('null');
      return;
    }
    return plan;
  }

  @Post('members/:memberId/sessions')
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'trainer')
  startMemberSession(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.trainingService.startMemberSession(
      memberId,
      dto.dayNumber,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch('members/:memberId/sessions/:id/sets')
  @Roles('owner', 'trainer')
  patchMemberSet(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('id') id: string,
    @Body() dto: PatchSetDto,
  ) {
    return this.trainingService.patchMemberSet(
      id,
      memberId,
      req.user.sub,
      req.user.role,
      dto,
    );
  }

  @Post('members/:memberId/sessions/:id/finish')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'trainer')
  finishMemberSession(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('id') id: string,
    @Body() dto: FinishSessionDto,
  ) {
    return this.trainingService.finishMemberSession(
      id,
      memberId,
      req.user.sub,
      req.user.role,
      dto.rpe,
    );
  }

  @Post('members/:memberId/sessions/:id/sets/add')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'trainer')
  addMemberSet(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('id') id: string,
    @Body() dto: AddSetDto,
  ) {
    return this.trainingService.addMemberSet(
      id,
      memberId,
      req.user.sub,
      req.user.role,
      dto.exerciseId,
    );
  }

  @Delete('members/:memberId/sessions/:id/sets')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'trainer')
  deleteMemberSet(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('id') id: string,
    @Body() dto: DeleteSetDto,
  ) {
    return this.trainingService.deleteMemberSet(
      id,
      memberId,
      req.user.sub,
      req.user.role,
      dto.exerciseId,
      dto.setNumber,
    );
  }

  @Get('members/:memberId/history')
  @Roles('owner', 'trainer')
  getHistory(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    return this.trainingService.getHistory(
      memberId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/progress')
  @Roles('owner', 'trainer')
  getProgress(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    return this.trainingService.getProgress(
      memberId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/exercise/:exerciseId')
  @Roles('owner', 'trainer')
  getExerciseHistory(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.trainingService.getExerciseHistory(
      memberId,
      exerciseId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/personal-bests')
  @Roles('owner', 'trainer')
  getPersonalBests(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    return this.trainingService.getPersonalBests(
      memberId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/active-session')
  @Roles('owner', 'trainer')
  async getActiveSession(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.trainingService.getActiveSession(
      memberId,
      req.user.sub,
      req.user.role,
    );
    if (session === null) {
      res.setHeader('Content-Type', 'application/json');
      res.send('null');
      return;
    }
    return session;
  }
}
