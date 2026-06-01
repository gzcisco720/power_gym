import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OwnerDashboardService } from './owner-dashboard.service';
import { TrainerDashboardService } from './trainer-dashboard.service';
import { MemberDashboardService } from './member-dashboard.service';

interface AuthenticatedRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly ownerDashboardService: OwnerDashboardService,
    private readonly trainerDashboardService: TrainerDashboardService,
    private readonly memberDashboardService: MemberDashboardService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles('owner')
  @Get('owner')
  getOwnerDashboard() {
    return this.ownerDashboardService.getOwnerDashboard();
  }

  @UseGuards(RolesGuard)
  @Roles('trainer')
  @Get('trainer')
  getTrainerDashboard(@Request() req: AuthenticatedRequest) {
    return this.trainerDashboardService.getTrainerDashboard(req.user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles('member')
  @Get('member')
  getMemberDashboard(
    @Request() req: AuthenticatedRequest,
    @Query('exercise') exercise?: string,
  ) {
    return this.memberDashboardService.getMemberDashboard(
      req.user.sub,
      exercise,
    );
  }
}
