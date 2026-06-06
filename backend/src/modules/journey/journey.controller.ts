import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import {
  JourneyService,
  JourneySummary,
  JourneyTimelinePage,
} from './journey.service';
import { JourneyTimelineQueryDto } from './dto/journey-timeline.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('journey')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Get()
  @Roles('member')
  getMyJourney(@Request() req: RequestWithUser): Promise<JourneySummary> {
    return this.journeyService.getSummary(req.user.sub);
  }

  @Get('timeline')
  @Roles('member')
  getMyTimeline(
    @Request() req: RequestWithUser,
    @Query() query: JourneyTimelineQueryDto,
  ): Promise<JourneyTimelinePage> {
    return this.journeyService.getTimeline(req.user.sub, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
