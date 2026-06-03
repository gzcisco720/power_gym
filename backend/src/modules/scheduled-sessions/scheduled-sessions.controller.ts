import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { ScheduledSessionsService } from './scheduled-sessions.service';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('scheduled-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduledSessionsController {
  constructor(
    private readonly scheduledSessionsService: ScheduledSessionsService,
  ) {}

  @Get('my')
  @Roles('member')
  findMySessions(@Request() req: RequestWithUser) {
    return this.scheduledSessionsService.findForMember(req.user.sub);
  }
}
