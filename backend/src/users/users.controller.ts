import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UsersService } from './users.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Shared members list (owner sees all; trainer sees own) ──

  @Get('members')
  listMembers(
    @CurrentUser() user: AuthUser,
    @Query('trainerId') trainerId?: string,
  ) {
    if (user.role === 'member') {
      throw new ForbiddenException('Members cannot access the member list');
    }
    if (user.role === 'owner' && trainerId) {
      return this.usersService.listAllMembers(trainerId);
    }
    return this.usersService.listMembers(user.role, user.userId);
  }

  @Get('members/:id')
  getMember(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role === 'member') {
      throw new ForbiddenException('Forbidden');
    }
    return this.usersService.getMember(user.role, user.userId, id);
  }

  // ── Member profile ─────────────────────────────────────────

  @Get('members/:id/profile')
  getMemberProfile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.getMemberProfile(user.role, user.userId, id);
  }

  @Patch('members/:id/profile')
  updateMemberProfile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.upsertMemberProfile(
      user.role,
      user.userId,
      id,
      dto,
    );
  }

  // ── Owner: member management ────────────────────────────────

  @Roles('owner')
  @Get('owner/members')
  listOwnerMembers(@Query('trainerId') trainerId?: string) {
    return this.usersService.listAllMembers(trainerId);
  }

  @Roles('owner')
  @Patch('owner/members/:id/trainer')
  @HttpCode(HttpStatus.OK)
  assignTrainer(@Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.usersService.assignTrainer(id, dto.trainerId);
  }

  // ── Owner: trainer management ────────────────────────────────

  @Roles('owner')
  @Get('owner/trainers')
  listTrainers() {
    return this.usersService.listTrainers();
  }

  // ── Owner: invites ───────────────────────────────────────────

  @Roles('owner')
  @Get('owner/invites')
  listOwnerInvites() {
    return this.usersService.listOwnerInvites();
  }

  @Roles('owner')
  @Post('owner/invites/:id/resend')
  @HttpCode(HttpStatus.OK)
  resendOwnerInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.resendInvite(id, user.role, user.userId);
  }

  @Roles('owner')
  @Delete('owner/invites/:id')
  @HttpCode(HttpStatus.OK)
  revokeOwnerInvite(@Param('id') id: string) {
    return this.usersService.revokeInvite(id);
  }

  // ── Owner: stats ─────────────────────────────────────────────

  @Roles('owner')
  @Get('owner/stats')
  getOwnerStats() {
    return this.usersService.getOwnerStats();
  }

  // ── Trainer: invites ─────────────────────────────────────────

  @Roles('trainer')
  @Get('trainer/invites')
  listTrainerInvites(@CurrentUser() user: AuthUser) {
    return this.usersService.listTrainerInvites(user.userId);
  }

  @Roles('trainer')
  @Post('trainer/invites/:id/resend')
  @HttpCode(HttpStatus.OK)
  resendTrainerInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.resendInvite(id, user.role, user.userId);
  }

  @Roles('trainer')
  @Delete('trainer/invites/:id')
  @HttpCode(HttpStatus.OK)
  async revokeTrainerInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    // Ownership check: only the trainer who created the invite can revoke it
    await this.usersService.assertInviteOwner(id, user.userId);
    return this.usersService.revokeInvite(id);
  }

  // ── Shared: create invite ────────────────────────────────────

  @Post('invites')
  @HttpCode(HttpStatus.CREATED)
  async createInvite(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInviteDto,
  ) {
    const invite = await this.usersService.createInvite(
      user.role,
      user.userId,
      dto,
    );
    return { token: invite.token };
  }
}
