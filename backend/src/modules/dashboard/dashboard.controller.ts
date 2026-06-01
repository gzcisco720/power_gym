import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OwnerDashboardService } from './owner-dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly ownerDashboardService: OwnerDashboardService) {}

  @UseGuards(RolesGuard)
  @Roles('owner')
  @Get('owner')
  getOwnerDashboard() {
    return this.ownerDashboardService.getOwnerDashboard();
  }
}
