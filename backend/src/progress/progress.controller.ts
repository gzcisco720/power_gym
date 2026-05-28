import { Controller, Get, Param } from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Roles('owner', 'trainer', 'member')
  @Get(':memberId')
  getMemberProgress(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.progressService.getMemberProgress(user, memberId.toString());
  }
}
