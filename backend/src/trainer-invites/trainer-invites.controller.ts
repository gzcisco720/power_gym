import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  TrainerInvitesService,
  CreateTrainerInviteDto,
} from './trainer-invites.service';

@Roles('trainer')
@Controller('trainer/invites')
export class TrainerInvitesController {
  constructor(private readonly service: TrainerInvitesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTrainerInviteDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, { userId: user.userId, name: user.email });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.revoke(id, user.userId);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.resend(id, user.userId, user.email);
  }
}
