import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { ScheduleService, type Scope } from './schedule.service';
import type { UpdateScheduledSessionData } from '../repositories/scheduled-session.repository';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

interface JwtPayload {
  sub: string;
  role: string;
}

class CreateSessionDto {
  trainerId?: string;
  memberIds!: string[];
  date!: string;
  startTime!: string;
  endTime!: string;
  isRecurring?: boolean;
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  customFee?: number | null;
}

class UpdateSessionDto {
  scope!: string;
  trainerId?: string;
  memberIds?: string[];
  startTime?: string;
  endTime?: string;
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  customFee?: number | null;
}

class DeleteSessionDto {
  scope!: string;
}

function isScope(s: string | undefined): s is Scope {
  return s === 'one' || s === 'future' || s === 'all';
}

@Controller('schedule')
@Roles('owner', 'trainer', 'member')
export class ScheduleController {
  constructor(private readonly svc: ScheduleService) {}

  @Post()
  @Roles('owner', 'trainer')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateSessionDto,
  ) {
    const trainerId =
      user.role === 'owner'
        ? typeof body.trainerId === 'string' && body.trainerId
          ? body.trainerId
          : null
        : user.sub;

    if (!trainerId) throw new BadRequestException('trainerId is required');
    if (!Array.isArray(body.memberIds) || body.memberIds.length === 0) {
      throw new BadRequestException('memberIds must be a non-empty array');
    }
    if (!body.date || !body.startTime || !body.endTime) {
      throw new BadRequestException('date, startTime, endTime are required');
    }

    const hasServiceType =
      typeof body.serviceTypeId === 'string' && body.serviceTypeId;
    const hasCustom =
      typeof body.customServiceName === 'string' &&
      body.customServiceName.trim() &&
      typeof body.customFee === 'number';

    if (!hasServiceType && !hasCustom) {
      throw new BadRequestException(
        'Either serviceTypeId or customServiceName + customFee is required',
      );
    }

    return this.svc.create({
      trainerId,
      memberIds: body.memberIds,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      isRecurring: body.isRecurring === true,
      serviceTypeId: hasServiceType ? (body.serviceTypeId as string) : null,
      customServiceName: hasCustom
        ? (body.customServiceName as string).trim()
        : null,
      customFee: hasCustom ? (body.customFee as number) : null,
    });
  }

  @Get()
  async getRange(
    @CurrentUser() user: JwtPayload,
    @Query('start') startStr: string,
    @Query('end') endStr: string,
    @Query('trainerId') trainerIdParam?: string,
  ) {
    if (!startStr || !endStr) {
      throw new BadRequestException('start and end are required');
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (user.role === 'owner' && trainerIdParam) {
      if (!/^[a-f0-9]{24}$/.test(trainerIdParam)) {
        throw new BadRequestException('Invalid trainerId format');
      }
    }

    return this.svc.getRange(start, end, { role: user.role, userId: user.sub });
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles('owner', 'trainer')
  async deleteSession(@Param('id') id: string, @Body() body: DeleteSessionDto) {
    if (!isScope(body.scope)) {
      throw new BadRequestException('scope must be one of: one, future, all');
    }
    await this.svc.deleteSession(id, body.scope);
    return { success: true };
  }

  @Patch(':id')
  @Roles('owner', 'trainer')
  async updateSession(@Param('id') id: string, @Body() body: UpdateSessionDto) {
    if (!isScope(body.scope)) {
      throw new BadRequestException('scope must be one of: one, future, all');
    }

    const hasServiceType =
      typeof body.serviceTypeId === 'string' && body.serviceTypeId;
    const hasCustom =
      typeof body.customServiceName === 'string' &&
      body.customServiceName.trim() &&
      typeof body.customFee === 'number';

    if (
      (body.serviceTypeId !== undefined ||
        body.customServiceName !== undefined) &&
      !hasServiceType &&
      !hasCustom
    ) {
      throw new BadRequestException(
        'Either serviceTypeId or customServiceName + customFee is required',
      );
    }

    const data: UpdateScheduledSessionData = {};
    if (typeof body.trainerId === 'string') data.trainerId = body.trainerId;
    if (Array.isArray(body.memberIds)) data.memberIds = body.memberIds;
    if (typeof body.startTime === 'string') data.startTime = body.startTime;
    if (typeof body.endTime === 'string') data.endTime = body.endTime;
    if (hasServiceType) {
      data.serviceTypeId = body.serviceTypeId;
      data.customServiceName = null;
      data.customFee = null;
    } else if (hasCustom) {
      data.serviceTypeId = null;
      data.customServiceName = (body.customServiceName as string).trim();
      data.customFee = body.customFee;
    }

    await this.svc.updateSession(id, body.scope, data);
    return { success: true };
  }
}
