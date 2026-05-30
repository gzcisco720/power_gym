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
import { MembersService } from './members.service';

@Roles('owner', 'trainer')
@Controller('progress')
export class ProgressController {
  constructor(private readonly service: MembersService) {}

  @Get(':memberId')
  getProgress(
    @Param('memberId') memberId: string,
    @Query('exerciseId') exerciseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!exerciseId) throw new BadRequestException('exerciseId is required');
    return this.service.getProgress(
      memberId,
      exerciseId,
      user.userId,
      user.role,
    );
  }
}
