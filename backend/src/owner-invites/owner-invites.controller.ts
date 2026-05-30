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
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { OwnerInvitesService, CreateInviteDto } from './owner-invites.service';

@Roles('owner')
@Controller('owner/invites')
export class OwnerInvitesController {
  constructor(private readonly service: OwnerInvitesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list() {
    return this.service.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInviteDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, { userId: user.userId, name: user.email });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.resend(id, user.email);
  }
}
