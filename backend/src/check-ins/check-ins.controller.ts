import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CheckInsService } from './check-ins.service';
import type { CreateCheckInData } from '../repositories/check-in.repository';

type CheckInBody = Omit<CreateCheckInData, 'memberId' | 'trainerId'>;

@Controller('check-ins')
@Roles('owner', 'trainer', 'member')
export class CheckInsController {
  constructor(private readonly svc: CheckInsService) {}

  @Get()
  async list(
    @Query('memberId') queryMemberId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === 'member') {
      return this.svc.list(user.userId, user.userId, 'member');
    }
    if (!queryMemberId) {
      throw new BadRequestException('memberId is required');
    }
    return this.svc.list(queryMemberId, user.userId, user.role);
  }

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: CheckInBody & { memberId?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const memberId = user.role === 'member' ? user.userId : body.memberId;
    if (!memberId) throw new BadRequestException('memberId is required');
    // v1: only member can self-submit check-ins
    if (user.role !== 'member') {
      throw new ForbiddenException();
    }
    const {
      submittedAt,
      sleepQuality,
      stress,
      fatigue,
      hunger,
      recovery,
      energy,
      digestion,
      weight,
      waist,
      steps,
      exerciseMinutes,
      walkRunDistance,
      sleepHours,
      dietDetails,
      stuckToDiet,
      wellbeing,
      notes,
      photos,
    } = body;
    return this.svc.create(memberId, {
      submittedAt,
      sleepQuality,
      stress,
      fatigue,
      hunger,
      recovery,
      energy,
      digestion,
      weight,
      waist,
      steps,
      exerciseMinutes,
      walkRunDistance,
      sleepHours,
      dietDetails,
      stuckToDiet,
      wellbeing,
      notes,
      photos,
    });
  }
}

@Controller('check-ins')
@Roles('member')
export class CheckInDetailController {
  constructor(private readonly svc: CheckInsService) {}

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // v1: only member can get their own check-in detail
    const all = await this.svc.list(user.userId, user.userId, 'member');
    const found = all.find((c) => c._id.toString() === id);
    if (!found) throw new NotFoundException('Not found');
    if (found.memberId.toString() !== user.userId) {
      throw new ForbiddenException();
    }
    return found;
  }
}
