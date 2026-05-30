import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { OwnerDashboardService } from './owner-dashboard.service';

@Roles('owner')
@Controller('owner')
export class OwnerDashboardController {
  constructor(private readonly service: OwnerDashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.service.getStats();
  }

  @Get('trainer-breakdown')
  @HttpCode(HttpStatus.OK)
  getTrainerBreakdown() {
    return this.service.getTrainerBreakdown();
  }

  @Get('member-growth')
  @HttpCode(HttpStatus.OK)
  getMemberGrowth() {
    return this.service.getMemberGrowth();
  }

  @Get('equipment-status')
  @HttpCode(HttpStatus.OK)
  getEquipmentStatus() {
    return this.service.getEquipmentStatus();
  }
}
