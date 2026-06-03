import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ListSessionsQuery } from './dto/list-sessions.query';

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

  @Get()
  @Roles('owner', 'trainer')
  listSessions(
    @Request() req: RequestWithUser,
    @Query() query: ListSessionsQuery,
  ) {
    return this.scheduledSessionsService.listForStaff(
      req.user.role as 'owner' | 'trainer',
      req.user.sub,
      query.range ?? 'upcoming',
    );
  }

  @Post()
  @Roles('owner', 'trainer')
  createSession(
    @Body() dto: CreateSessionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.scheduledSessionsService.createSession(
      dto,
      req.user.role as 'owner' | 'trainer',
      req.user.sub,
    );
  }

  @Patch(':id')
  @Roles('owner', 'trainer')
  updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.scheduledSessionsService.updateSession(
      id,
      dto,
      req.user.role as 'owner' | 'trainer',
      req.user.sub,
    );
  }

  @Delete(':id')
  @Roles('owner', 'trainer')
  deleteSession(
    @Param('id') id: string,
    @Query('scope') scope: 'single' | 'series' | undefined,
    @Request() req: RequestWithUser,
  ) {
    return this.scheduledSessionsService.deleteSession(
      id,
      scope ?? 'single',
      req.user.role as 'owner' | 'trainer',
      req.user.sub,
    );
  }
}
