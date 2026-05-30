import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CheckInConfigService } from './check-in-config.service';
import type { UpsertCheckInConfigData } from '../repositories/check-in-config.repository';

@Controller('check-in-config')
@Roles('owner', 'trainer', 'member')
export class CheckInConfigController {
  constructor(private readonly svc: CheckInConfigService) {}

  @Get()
  async get(
    @Query('memberId') queryMemberId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const memberId =
      user.role === 'member' ? user.userId : (queryMemberId ?? user.userId);
    const config = await this.svc.get(memberId, user.userId, user.role);
    return { config };
  }

  @Put()
  async upsert(
    @Body() body: UpsertCheckInConfigData & { memberId?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const memberId =
      user.role === 'member' ? user.userId : (body.memberId ?? user.userId);
    const configData: UpsertCheckInConfigData = {
      dayOfWeek: body.dayOfWeek,
      hour: body.hour,
      minute: body.minute,
      active: body.active,
    };
    return this.svc.upsert(memberId, configData, user.userId, user.role);
  }
}
