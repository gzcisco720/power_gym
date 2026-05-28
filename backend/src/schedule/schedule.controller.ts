import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Roles('owner', 'trainer')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(user, dto);
  }

  @Get('member/:memberId')
  getMemberCalendar(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.scheduleService.getMemberCalendar(user, memberId.toString());
  }

  @Roles('owner', 'trainer')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.scheduleService.cancel(user, id.toString());
  }
}
