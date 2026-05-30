import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { MemberPortalService } from './member-portal.service';

@Controller()
@Roles('member')
export class MemberPortalController {
  constructor(private readonly svc: MemberPortalService) {}

  /** GET /me/dashboard — member-only: returns aggregated dashboard data */
  @Get('me/dashboard')
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.svc.getDashboard(user.userId);
  }

  /** GET /me/member-plan — returns the member's active training plan (days + exercises) */
  @Get('me/member-plan')
  async getActivePlan(@CurrentUser() user: AuthUser) {
    return this.svc.getActivePlan(user.userId);
  }

  /** GET /members/:id/journey — member can only read own journey */
  @Get('members/:id/journey')
  async getJourney(
    @Param('id') memberId: string,
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
  ) {
    const parsed = parseInt(limitStr ?? '10', 10);
    const limit = Number.isFinite(parsed) ? parsed : 10;
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('limit must be between 1 and 50');
    }
    return this.svc.getJourney(memberId, user.userId, cursor, limit);
  }
}
