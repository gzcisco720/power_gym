import {
  Body,
  Controller,
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
  finishSession(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.trainingService.finishSession(id, req.user.sub);
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
}
